/* eslint-disable no-bitwise */
import Ember from 'ember';

import { gte } from 'ember-compatibility-helpers';

type UpdatableTag = undefined;

type ObjMap<T> = { [key: string]: T };

enum MetaFlags {
  NONE = 0,
  SOURCE_DESTROYING = 1 << 0,
  SOURCE_DESTROYED = 1 << 1,
  META_DESTROYED = 1 << 2,
  INITIALIZING = 1 << 3
}

enum ListenerKind {
  ADD = 0,
  ONCE = 1,
  REMOVE = 2
}

interface StringListener {
  event: string;
  target: null;
  method: string;
  kind: ListenerKind.ADD | ListenerKind.ONCE | ListenerKind.REMOVE;
  sync: boolean;
}

interface FunctionListener {
  event: string;
  target: object | null;
  method: Function;
  kind: ListenerKind.ADD | ListenerKind.ONCE | ListenerKind.REMOVE;
  sync: boolean;
}

type Listener = StringListener | FunctionListener;

/**
 * @see https://github.com/emberjs/ember.js/blob/4e254b3937abf7b6221eee11ae77f3b8a9878777/packages/@ember/-internals/meta/lib/meta.ts#L96
 */
// eslint-disable-next-line @typescript-eslint/class-name-casing
declare class _Meta {
  private _descriptors: Map<string, any> | undefined;
  private _mixins: any | undefined;
  private _flags: MetaFlags;
  private _lazyChains: ObjMap<ObjMap<UpdatableTag>> | undefined;
  source: object;
  proto: object | undefined;
  private _parent: Meta | undefined | null;

  private _listeners: Listener[] | undefined;
  private _listenersVersion: number;
  private _inheritedEnd: number;
  private _flattenedVersion: number;

  // DEBUG
  private _values: any | undefined;

  constructor(obj: object);

  readonly parent: Meta | undefined | null;

  setInitializing(): void;
  unsetInitializing(): void;

  isInitializing(): boolean;

  isPrototypeMeta(obj: object): boolean;

  destroy(): void;

  isSourceDestroying(): boolean;
  setSourceDestroying(): void;

  isSourceDestroyed(): boolean;
  setSourceDestroyed(): void;

  isMetaDestroyed(): boolean;
  setMetaDestroyed(): void;

  private _hasFlag(flag: number): boolean;

  private _getOrCreateOwnMap(key: string): Record<string, unknown>;
  private _getOrCreateOwnSet(key: string): Set<unknown>;

  private _findInheritedMap(key: string, subkey: string): any | undefined;
  private _hasInInheritedSet(key: string, value: any): boolean;

  writableLazyChainsFor(key: string): ObjMap<UpdatableTag>;
  readableLazyChainsFor(key: string): ObjMap<UpdatableTag> | undefined;

  addMixin(mixin: any): void;

  hasMixin(mixin: any): boolean;

  forEachMixins(fn: Function): void;

  writeDescriptors(subkey: string, value: any): void;

  peekDescriptors(subkey: string): undefined | unknown;

  removeDescriptors(subkey: string): void;

  forEachDescriptors(fn: Function): void;

  addToListeners(
    eventName: string,
    target: object | null,
    method: Function | string,
    once: boolean,
    sync: boolean
  ): void;

  removeFromListeners(
    eventName: string,
    target: object | null,
    method: Function | string
  ): void;

  private pushListener(
    event: string,
    target: object | null,
    method: Function | string,
    kind: ListenerKind.ADD | ListenerKind.ONCE | ListenerKind.REMOVE,
    sync?: boolean
  ): void;

  private writableListeners(): Listener[];

  /**
    Flattening is based on a global revision counter. If the revision has
    bumped it means that somewhere in a class inheritance chain something has
    changed, so we need to reflatten everything. This can only happen if:

    1. A meta has been flattened (listener has been called)
    2. The meta is a prototype meta with children who have inherited its
       listeners
    3. A new listener is subsequently added to the meta (e.g. via `.reopen()`)

    This is a very rare occurrence, so while the counter is global it shouldn't
    be updated very often in practice.
  */
  private flattenedListeners(): Listener[] | undefined;

  matchingListeners(
    eventName: string
  ): (string | boolean | object | null)[] | undefined;

  observerEvents(): undefined | unknown[];
}

export type Meta = _Meta;
export const Meta = gte('3.6.0')
  ? // eslint-disable-next-line @typescript-eslint/ban-ts-ignore
    // @ts-ignore
    (Ember.__loader.require('@ember/-internals/meta/lib/meta')
      .Meta as typeof _Meta)
  : // eslint-disable-next-line @typescript-eslint/ban-ts-ignore
    // @ts-ignore
    (Ember.__loader.require('ember-meta/lib/meta').Meta as typeof _Meta);

/**
 * Retrieves the meta hash for an object. If `writable` is true ensures the hash
 * is writable for this object as well.
 *
 * The meta object contains information about computed property descriptors as
 * well as any watched properties and other information. You generally will not
 * access this information directly but instead work with higher level methods
 * that manipulate this hash indirectly.
 *
 * @see https://github.com/emberjs/ember.js/blob/4e254b3937abf7b6221eee11ae77f3b8a9878777/packages/@ember/-internals/meta/lib/meta.ts#L660
 * @see https://github.com/emberjs/ember.js/blob/bf273deb002904d85bf2b832c8877739920d7a08/packages/ember/index.js#L308
 *
 * @param {Object} obj The object to retrieve meta for
 * @return {Object} the meta hash for an object
 */
// eslint-disable-next-line @typescript-eslint/ban-ts-ignore
// @ts-ignore
export const meta = Ember.meta as (obj: object) => Meta;

/**
 * Tears down the meta on an object so that it can be garbage collected.
 * Multiple calls will have no effect.
 *
 * @see https://github.com/emberjs/ember.js/blob/4e254b3937abf7b6221eee11ae77f3b8a9878777/packages/@ember/-internals/meta/lib/meta.ts#L660
 * @see https://github.com/emberjs/ember.js/blob/bf273deb002904d85bf2b832c8877739920d7a08/packages/ember/index.js#L334
 *
 * @param {Object} obj  the object to destroy
 * @return {void}
 */
// eslint-disable-next-line @typescript-eslint/ban-ts-ignore
// @ts-ignore
export const deleteMeta = Ember.destroy as (obj: object) => void;
