import { gte } from 'ember-compatibility-helpers';

import CoreObject from '@ember/object/core';

import { destroy as _destroy, registerDestructor } from '..';

if (!gte('3.20.0-beta.4')) {
  const callWillDestroy = (instance: CoreObject) => instance.willDestroy();

  CoreObject.prototype.init = function init() {
    registerDestructor(this, callWillDestroy);
  };

  CoreObject.prototype.destroy = function destroy() {
    _destroy(this);
    return this;
  };
}
