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
declare function associateDestroyableChild<T extends object>(
  parent: object,
  child: T
): T;

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
declare function registerDestructor<T extends object>(
  destroyable: T,
  destructor: (destroyable: T) => void
): (destroyable: T) => void;

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
declare function unregisterDestructor<T extends object>(
  destroyable: T,
  destructor: (destroyable: T) => void
): void;

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
declare function destroy(destroyable: object): void;

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
declare function isDestroying(destroyable: object): boolean;

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
declare function isDestroyed(destroyable: object): boolean;

/**
 * This function asserts that all objects which have associated destructors or
 * associated children have been destroyed at the time it is called. It is meant
 * to be a low level hook that testing frameworks like `ember-qunit` and
 * `ember-mocha` can use to hook into and validate that all destroyables have in
 * fact been destroyed.
 */
declare function assertDestroyablesDestroyed(): void;
