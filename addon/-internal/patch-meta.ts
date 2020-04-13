import { runDestructors } from './destructors';
import { Meta } from './meta';

const { setSourceDestroying } = Meta.prototype;

Meta.prototype.setSourceDestroying = function () {
  setSourceDestroying.call(this);
  runDestructors(this.source);
};
