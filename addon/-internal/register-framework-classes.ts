import CoreObject from '@ember/object/core';
import GlimmerComponent from '@glimmer/component';

import { registerDestroyable } from './register-destroyable';

registerDestroyable(CoreObject);
registerDestroyable(GlimmerComponent);
