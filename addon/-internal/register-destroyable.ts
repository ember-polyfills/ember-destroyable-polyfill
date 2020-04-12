import { destroy as _destroy } from '@ember/destroyable';

const DESTROYABLES = new WeakSet();

export function registerDestroyable(
  Class: new () => { destroy?: () => unknown; willDestroy?: () => unknown }
): void {
  if (DESTROYABLES.has(Class)) return;
  DESTROYABLES.add(Class);

  const {
    destroy: originalDestroy,
    willDestroy: originalWillDestroy
  } = Class.prototype;

  if (originalDestroy) {
    // eslint-disable-next-line no-param-reassign
    Class.prototype.destroy = function destroy() {
      _destroy(this);
      return originalDestroy.call(this);
    };
  } else if (originalWillDestroy) {
    // eslint-disable-next-line no-param-reassign
    Class.prototype.willDestroy = function willDestroy() {
      _destroy(this);
      return originalWillDestroy.call(this);
    };
  } else {
    throw new Error(`Cannot register '${Class}' as a destroyable.`);
  }
}
