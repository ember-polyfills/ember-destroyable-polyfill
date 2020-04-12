import { module, test } from 'qunit';

import {
  isDestroying,
  isDestroyed,
  associateDestroyableChild,
  registerDestructor,
  unregisterDestructor,
  destroy,
  assertDestroyablesDestroyed
} from '@ember/destroyable';
import { run } from '@ember/runloop';

module('destroyable', function (_hooks) {
  test('basic smoke test', function (assert) {
    assert.expect(23);

    function makeDestructor(step: string, expectedInstance: object) {
      function destructor(instance: object) {
        assert.step(step);
        assert.strictEqual(
          instance,
          expectedInstance,
          `Destructor '${step}' was called for the instance it was registered for.`
        );
      }
      destructor.toString = () => step;
      return destructor;
    }

    const parent = {
      toString() {
        return 'parent';
      }
    };
    const child = {
      toString() {
        return 'child';
      }
    };

    associateDestroyableChild(parent, child);

    const parentUnregistered = makeDestructor('parent-unregistered', parent);
    registerDestructor(parent, makeDestructor('parent-first', parent));
    registerDestructor(parent, parentUnregistered);
    registerDestructor(parent, makeDestructor('parent-second', parent));
    unregisterDestructor(parent, parentUnregistered);

    const childUnregistered = makeDestructor('child-unregistered', child);
    registerDestructor(child, makeDestructor('child-first', child));
    registerDestructor(child, childUnregistered);
    registerDestructor(child, makeDestructor('child-second', child));
    unregisterDestructor(child, childUnregistered);

    assert.notOk(isDestroying(parent));
    assert.notOk(isDestroyed(parent));
    assert.notOk(isDestroying(child));
    assert.notOk(isDestroyed(child));

    assert.throws(
      () => assertDestroyablesDestroyed(),
      /Not all destroyable objects were destroyed/
    );

    run(() => {
      destroy(parent);

      assert.ok(isDestroying(parent));
      assert.notOk(isDestroyed(parent));
      assert.ok(isDestroying(child));
      assert.notOk(isDestroyed(child));

      assert.throws(
        () => assertDestroyablesDestroyed(),
        /Not all destroyable objects were destroyed/
      );
    });

    assert.ok(isDestroying(parent));
    assert.ok(isDestroyed(parent));
    assert.ok(isDestroying(child));
    assert.ok(isDestroyed(child));

    assert.verifySteps(
      ['parent-first', 'parent-second', 'child-first', 'child-second'],
      'Destructors were called in correct order.'
    );

    assertDestroyablesDestroyed();
  });
});
