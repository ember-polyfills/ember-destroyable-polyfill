import Ember from 'ember';

import { gte } from 'ember-compatibility-helpers';

export const Meta = gte('3.6.0')
  ? // @ts-ignore
    Ember.__loader.require('@ember/-internals/meta/lib/meta').Meta
  : // @ts-ignore
    Ember.__loader.require('ember-meta/lib/meta').Meta;

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
export const meta = (Ember as any).meta as (obj: object) => any;
