import { assert } from '@ember/debug';
import { schedule } from '@ember/runloop';
import { DEBUG } from '@glimmer/env';
import Ember from 'ember';

import { gte } from 'ember-compatibility-helpers';

import { meta } from './meta';

export type Destructor<T extends object = object> = (destroyable: T) => void;

let isTesting = false;
let DESTRUCTORS:
  | Map<object, Set<Destructor>>
  | WeakMap<object, Set<Destructor>> = new Map<object, Set<Destructor>>();
let DESTROYABLE_PARENTS:
  | Map<object, object>
  | WeakMap<object, object> = new WeakMap<object, object>();
const DESTROYABLE_CHILDREN = new WeakMap<object, Set<object>>();

/**
 * Tears down the meta on an object so that it can be garbage collected.
 * Multiple calls will have no effect.
 *
 * On Ember < 3.16.4 this just calls `meta.destroy`
 * On Ember >= 3.16.4 this calls setSourceDestroying and schedules setSourceDestroyed + `meta.destroy`
 *
 * @param {Object} obj  the object to destroy
 * @return {void}
 */
const _upstreamDestroy = (Ember as any).destroy as (obj: object) => void;

let _internalRegisterDestructor: Function;
let _internalAssociateDestroyableChild: Function;
let _internalIsDestroying: Function;
let _internalIsDestroyed: Function;
let _internalUnregisterDestructor: Function;
let _internalDestroy: Function;
let _internalAssertDestroyablesDestroyed: Function;
let _internalEnableDestroyableTracking: Function;

if (gte('3.20.0-beta.4')) {
  const glimmerRuntime = (Ember as any).__loader.require('@glimmer/runtime');

  _internalRegisterDestructor = glimmerRuntime.registerDestructor;
  _internalAssociateDestroyableChild = glimmerRuntime.associateDestroyableChild;
  _internalIsDestroying = glimmerRuntime.isDestroying;
  _internalIsDestroyed = glimmerRuntime.isDestroyed;
  _internalUnregisterDestructor = glimmerRuntime.unregisterDestructor;
  _internalDestroy = glimmerRuntime.destroy;
  _internalAssertDestroyablesDestroyed =
    glimmerRuntime.assertDestroyablesDestroyed;
  _internalEnableDestroyableTracking = glimmerRuntime.enableDestroyableTracking;
}

function getDestructors<T extends object>(destroyable: T): Set<Destructor<T>> {
  if (!DESTRUCTORS.has(destroyable)) DESTRUCTORS.set(destroyable, new Set());
  return DESTRUCTORS.get(destroyable)!;
}

function getDestroyableChildren(destroyable: object): Set<object> {
  if (!DESTROYABLE_CHILDREN.has(destroyable))
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
  if (gte('3.20.0-beta.4')) {
    return _internalIsDestroying(destroyable);
  }

  return meta(destroyable).isSourceDestroying();
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
  if (gte('3.20.0-beta.4')) {
    return _internalIsDestroyed(destroyable);
  }

  return meta(destroyable).isSourceDestroyed();
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
  if (gte('3.20.0-beta.4')) {
    return _internalAssociateDestroyableChild(parent, child);
  }

  if (DEBUG) assertNotDestroyed(parent);
  if (DEBUG) assertNotDestroyed(child);

  assert(
    `'${child}' is already a child of '${parent}'.`,
    !DESTROYABLE_PARENTS.has(child)
  );

  DESTROYABLE_PARENTS.set(child, parent);
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
  if (gte('3.20.0-beta.4')) {
    return _internalRegisterDestructor(destroyable, destructor);
  }

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
  if (gte('3.20.0-beta.4')) {
    return _internalUnregisterDestructor(destroyable, destructor);
  }

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
  if (gte('3.20.0-beta.4')) {
    _internalDestroy(destroyable);
    return;
  }

  if (isDestroying(destroyable) || isDestroyed(destroyable)) return;

  if (gte('3.16.4')) {
    // Ember.destroy calls setSourceDestroying (which runs runDestructors) and schedules setSourceDestroyed
    _upstreamDestroy(destroyable);
    return;
  }

  const m = meta(destroyable);

  m.setSourceDestroying(); // This calls `runDestructors`
}

const RUNNING = new WeakSet();

export function runDestructors(destroyable: object): void {
  if (RUNNING.has(destroyable)) return;
  RUNNING.add(destroyable);

  const m = meta(destroyable);

  for (const child of getDestroyableChildren(destroyable)) destroy(child);

  for (const destructor of getDestructors(destroyable)) {
    schedule('actions', undefined, destructor, destroyable);
  }

  schedule('destroy', () => {
    if (!gte('3.16.4')) {
      // between Ember 2.18 and 3.16.4 Ember.destroy
      _upstreamDestroy(destroyable);
      m.setSourceDestroyed();
    }
    DESTRUCTORS.delete(destroyable);
    DESTROYABLE_PARENTS.delete(destroyable);
  });
}

interface UndestroyedDestroyablesAssertionError extends Error {
  destroyables: object[];
}

/**
 * This function sets up the internal destroyables system in order to be able to call
 * assertDestroyablesDestroyed later.
 */
export function enableDestroyableTracking() {
  if (gte('3.20.2')) {
    return _internalEnableDestroyableTracking();
  }
  if (gte('3.20.0-beta.4')) {
    // on 3.20.0-beta.4 through 3.20.2 (estimated) there is an issue with the upstream
    // `assertDestroyablesDestroyed` method that triggers the assertion in cases that it
    // should not; in order to allow code bases to function on those specific Ember versions
    // (including our own test suite) we detect and do nothing
    //
    // See https://github.com/glimmerjs/glimmer-vm/pull/1119
    return;
  }

  DESTRUCTORS = new Map<object, Set<Destructor>>();
  DESTROYABLE_PARENTS = new Map<object, object>();
  isTesting = true;
}

/**
 * This function asserts that all objects which have associated destructors or
 * associated children have been destroyed at the time it is called. It is meant
 * to be a low level hook that testing frameworks like `ember-qunit` and
 * `ember-mocha` can use to hook into and validate that all destroyables have in
 * fact been destroyed.
 */
export function assertDestroyablesDestroyed(): void | never {
  if (gte('3.20.2')) {
    return _internalAssertDestroyablesDestroyed();
  }
  if (gte('3.20.0-beta.4')) {
    // on 3.20.0-beta.4 through 3.20.2 (estimated) there is an issue with the upstream
    // `assertDestroyablesDestroyed` method that triggers the assertion in cases that it
    // should not; in order to allow code bases to function on those specific Ember versions
    // (including our own test suite) we detect and do nothing
    //
    // See https://github.com/glimmerjs/glimmer-vm/pull/1119
    return;
  }

  if (!isTesting) {
    throw new Error(
      'Attempted to assert destroyables destroyed, but you did not start a destroyable test. Did you forget to call `enableDestroyableTracking()`'
    );
  }

  const destructors = DESTRUCTORS as Map<object, WeakSet<Destructor>>;
  const children = DESTROYABLE_PARENTS as Map<object, object>;

  isTesting = false;
  DESTRUCTORS = new WeakMap<object, Set<Destructor>>();
  DESTROYABLE_PARENTS = new WeakMap<object, object>();

  if (destructors.size > 0 || children.size > 0) {
    const error = new Error(
      `Some destroyables were not destroyed during this test`
    ) as UndestroyedDestroyablesAssertionError;

    Object.defineProperty(error, 'destroyables', {
      get() {
        return [...new Set([...destructors.keys(), ...children.keys()])];
      },
    });

    throw error;
  }
}
