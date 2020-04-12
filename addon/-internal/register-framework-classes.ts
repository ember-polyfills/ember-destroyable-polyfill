import CoreObject from '@ember/object/core';
import GlimmerComponent from '@glimmer/component';

import { registerDestroyable } from './register-destroyable';

registerDestroyable(CoreObject);
registerDestroyable(GlimmerComponent as any);

declare const require: {
  (name: string): { default?: unknown };
  has(name: string): boolean;
};

if (require.has('ember-modifier'))
  registerDestroyable(require('ember-modifier').default as any);
