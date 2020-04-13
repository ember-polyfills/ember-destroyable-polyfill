import CoreObject from '@ember/object/core';

import { destroy as _destroy, registerDestructor } from '..';

const callWillDestroy = (instance: CoreObject) => instance.willDestroy();

CoreObject.prototype.init = function init() {
  registerDestructor(this, callWillDestroy);
};

CoreObject.prototype.destroy = function destroy() {
  _destroy(this);
  return this;
};
