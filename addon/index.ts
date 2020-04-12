import { assert } from '@ember/debug';
import { schedule } from '@ember/runloop';
import { DEBUG } from '@glimmer/env';

export type Destructor<T extends object = object> = (destroyable: T) => void;

const DESTRUCTORS = DEBUG
  ? new Map<object, Set<Destructor>>()
  : new WeakMap<object, Set<Destructor>>();

const DESTROYABLE_CHILDREN = new WeakMap<object, Set<object>>();
const DESTROYABLE_PARENTS = DEBUG ? new Map<object, object>() : undefined;

const DESTROYING = new WeakSet();
const DESTROYED = new WeakSet();

function getDestructors<T extends object>(destroyable: T): Set<Destructor<T>> {
  if (!DESTRUCTORS.has(Object)) DESTRUCTORS.set(destroyable, new Set());
  return DESTRUCTORS.get(destroyable)!;
}

function getDestroyableChildren(destroyable: object): Set<object> {
  if (!DESTROYABLE_CHILDREN.has(Object))
    DESTROYABLE_CHILDREN.set(destroyable, new Set());
  return DESTROYABLE_CHILDREN.get(destroyable)!;
}

/**
 * Receives a destroyable, and returns `true` if the destroyable has begun
 * destroying. Otherwise returns false.
 *
 * @example
 * ```ts
 * const obj = {};
 * isDestroying(obj); // false
 * destroy(obj);
 * isDestroying(obj); // true
 * ```
 */
export function isDestroying(destroyable: object): boolean {
  return DESTROYING.has(destroyable);
}

/**
 * Receives a destroyable, and returns `true` if the destroyable has finished
 * destroying. Otherwise returns false.
 *
 * @example
 * ```ts
 * const obj = {};
 * isDestroyed(obj); // false
 * destroy(obj);
 * // ...sometime later, after scheduled destruction
 * isDestroyed(obj); // true
 * ```
 */
export function isDestroyed(destroyable: object): boolean {
  return DESTROYED.has(destroyable);
}

/**
 * Asserts that the destroyable was not yet destroyed and is not currently being
 * destroyed.
 */
function assertNotDestroyed(destroyable: object): void | never {
  assert(`'${destroyable}' was already destroyed.`, !isDestroyed(destroyable));
  assert(
    `'${destroyable}' is already being destroyed.`,
    !isDestroying(destroyable)
  );
}

/**
 * This function is used to associate a destroyable object with a parent.
 * When the parent is destroyed, all registered children will also be destroyed.
 *
 * Returns the associated child for convenience.
 *
 * @example
 * ```ts
 * class CustomSelect extends Component {
 *   constructor() {
 *     // obj is now a child of the component. When the component is destroyed,
 *     // obj will also be destroyed, and have all of its destructors triggered.
 *     this.obj = associateDestroyableChild(this, {});
 *   }
 * }
 * ```
 *
 * @note Attempting to associate a parent or child that has already been
 * destroyed throws an error.
 *
 * @note Attempting to associate a child to multiple parents throws an error.
 */
export function associateDestroyableChild<T extends object>(
  parent: object,
  child: T
): T {
  if (DEBUG) assertNotDestroyed(parent);
  if (DEBUG) assertNotDestroyed(child);

  assert(
    `'${child}' is already a child of '${parent}'.`,
    !DESTROYABLE_PARENTS?.has(child)
  );

  DESTROYABLE_PARENTS?.set(child, parent);
  getDestroyableChildren(parent).add(child);

  return child;
}

/**
 * Receives a destroyable object and a destructor function, and associates the
 * function with it.
 * When the destroyable is destroyed with `destroy`, or when its parent is
 * destroyed, the destructor function will be called.
 *
 * Multiple destructors can be associated with a given destroyable, and they can
 * be associated over time, allowing to dynamically add destructors as needed.
 *
 * Returns the associated destructor function for convenience.
 *
 * The destructor function is passed a single argument, which is the destroyable
 * itself. This allows the function to be reused multiple times for many
 * destroyables, rather than creating a closure function per destroyable.
 *
 * @example
 * ```ts
 * function unregisterResize(instance) {
 *   instance.resize.unregister(instance);
 * }
 *
 * class Modal extends Component {
 *   @service resize;
 *
 *   constructor() {
 *     this.resize.register(this, this.layout);
 *
 *     registerDestructor(this, unregisterResize);
 *   }
 * }
 * ```
 *
 * @note Registering a destructor on a destroyed object should throw an error.
 *
 * @note Attempting to register the same destructor multiple times should throw
 * an error.
 */
export function registerDestructor<T extends object>(
  destroyable: T,
  destructor: Destructor<T>
): Destructor<T> {
  if (DEBUG) assertNotDestroyed(destroyable);
  const destructors = getDestructors(destroyable);
  assert(
    `'${destructor}' is already registered with '${destroyable}'.`,
    !destructors.has(destructor)
  );
  destructors.add(destructor);
  return destructor;
}

/**
 * Receives a destroyable and a destructor function, and de-associates the
 * destructor from the destroyable.
 *
 * @example
 * ```ts
 * class Modal extends Component {
 *   @service modals;
 *
 *   constructor() {
 *     this.modals.add(this);
 *
 *     this.modalDestructor = registerDestructor(this, () => this.modals.remove(this));
 *   }
 *
 *   @action
 *   pinModal() {
 *     unregisterDestructor(this, this.modalDestructor);
 *   }
 * }
 * ```
 *
 * @note Calling on a destroyed object throws an error.
 *
 * @note Calling with a destructor that is not associated with the object throws
 * an error.
 */
export function unregisterDestructor<T extends object>(
  destroyable: T,
  destructor: Destructor<T>
): void {
  if (DEBUG) assertNotDestroyed(destroyable);
  const destructors = getDestructors(destroyable);
  assert(
    `'${destructor}' is not registered with '${destroyable}'.`,
    destructors.has(destructor)
  );
  destructors.delete(destructor);
}

/**
 * Initiates the destruction of a destroyable object. It runs all associated
 * destructors, and then destroys all children recursively.
 *
 * @example
 * ```ts
 * const obj = {};
 * registerDestructor(obj, () => console.log('destroyed!'));
 * destroy(obj); // this will schedule the destructor to be called
 * // ...some time later, during scheduled destruction
 * // destroyed!
 * ```
 *
 * Destruction via `destroy()` follows these steps:
 *
 * 1. Mark the destroyable such that `isDestroying(destroyable)` returns `true`
 * 2. Schedule calling the destroyable's destructors
 * 3. Call `destroy()` on each of the destroyable's associated children
 * 4. Schedule setting destroyable such that `isDestroyed(destroyable)` returns
 *    `true`
 *
 * This algorithm results in the entire tree of destroyables being first marked
 * as destroying, then having all of their destructors called, and finally all
 * being marked as `isDestroyed`. There won't be any in between states where
 * some items are marked as `isDestroying` while destroying, while others are
 * not.
 *
 * @note Calling `destroy` multiple times on the same destroyable is safe. It
 * will not throw an error, and will not take any further action.
 *
 * @note Calling `destroy` with a destroyable that has no destructors or
 * associated children will not throw an error, and will do nothing.
 *
 */
export function destroy(destroyable: object): void {
  if (isDestroying(destroyable) || isDestroyed(destroyable)) return;

  DESTROYING.add(destroyable);

  schedule('destroy', () => {
    for (const destructor of getDestructors(destroyable))
      destructor(destroyable);
  });

  for (const child of getDestroyableChildren(destroyable)) destroy(child);

  schedule('destroy', () => DESTROYED.add(destroyable));
}

interface UndestroyedDestroyablesAssertionError extends Error {
  destroyables: IterableIterator<object>;
}

/**
 * This function asserts that all objects which have associated destructors or
 * associated children have been destroyed at the time it is called. It is meant
 * to be a low level hook that testing frameworks like `ember-qunit` and
 * `ember-mocha` can use to hook into and validate that all destroyables have in
 * fact been destroyed.
 */
export function assertDestroyablesDestroyed(): void | never {
  if (!DEBUG)
    throw new Error(
      `'assertDestroyablesDestroyed()' is only available in DEBUG mode.`
    );

  const destructors = DESTRUCTORS as Map<object, WeakSet<Destructor>>;

  if (destructors.size > 0) {
    const error = new Error(
      `${destructors.size} objects were not destroyed`
    ) as UndestroyedDestroyablesAssertionError;
    error.destroyables = destructors.keys();
  }
}
