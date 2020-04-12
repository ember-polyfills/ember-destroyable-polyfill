import { destroy as _destroy } from '@ember/destroyable';
import CoreObject from '@ember/object/core';

const { destroy: originaDestroy } = CoreObject.prototype;

CoreObject.prototype.destroy = function destroy() {
  _destroy(this);
  return originaDestroy.call(this);
};
