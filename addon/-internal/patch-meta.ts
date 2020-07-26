import { gte } from 'ember-compatibility-helpers';

import { runDestructors } from './destructors';
import { Meta } from './meta';

if (!gte('3.20.0-beta.1')) {
  const { setSourceDestroying } = Meta.prototype;

  Meta.prototype.setSourceDestroying = function () {
    setSourceDestroying.call(this);
    runDestructors(this.source);
  };
}
