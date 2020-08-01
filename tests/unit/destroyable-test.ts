import { settled } from '@ember/test-helpers';
import { module, test } from 'qunit';

import {
  isDestroying,
  isDestroyed,
  associateDestroyableChild,
  registerDestructor,
  unregisterDestructor,
  destroy,
  assertDestroyablesDestroyed,
  enableDestroyableTracking,
} from '@ember/destroyable';
import CoreObject from '@ember/object/core';
import { run } from '@ember/runloop';

import { gte } from 'ember-compatibility-helpers';

function makeDestructor(
  assert: Assert,
  step: string,
  expectedInstance: object
) {
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

function registerTestDestructors(
  assert: Assert,
  label: string,
  destroyable: object
) {
  const unregistered = makeDestructor(
    assert,
    `${label}-unregistered`,
    destroyable
  );
  registerDestructor(
    destroyable,
    makeDestructor(assert, `${label}-first`, destroyable)
  );
  registerDestructor(destroyable, unregistered);
  registerDestructor(
    destroyable,
    makeDestructor(assert, `${label}-second`, destroyable)
  );
  unregisterDestructor(destroyable, unregistered);
}

function assertLifecycle(
  assert: Assert,
  expected: 'initialized' | 'destroying' | 'destroyed',
  destroyable: object
) {
  const expectedDestroyed = expected === 'destroyed';
  // https://github.com/emberjs/rfcs/pull/580#discussion_r407224630
  const expectedDestroying = expectedDestroyed || expected === 'destroying';

  assert.strictEqual(
    isDestroying(destroyable),
    expectedDestroying,
    expectedDestroying
      ? `${destroyable} is destroying`
      : `${destroyable} is not destroying`
  );
  assert.strictEqual(
    isDestroyed(destroyable),
    expectedDestroyed,
    expectedDestroying
      ? `${destroyable} is destroyed`
      : `${destroyable} is not destroyed`
  );

  if (destroyable instanceof CoreObject) {
    assert.strictEqual(
      destroyable.isDestroying,
      expectedDestroying,
      `${destroyable}.isDestroying = ${expectedDestroying}`
    );
    assert.strictEqual(
      destroyable.isDestroyed,
      expectedDestroyed,
      `${destroyable}.isDestroyed = ${expectedDestroyed}`
    );
  }
}

module('destroyable', function (_hooks) {
  test('basic smoke test', function (assert) {
    assert.expect(21);

    enableDestroyableTracking();

    const parent = {
      toString() {
        return 'parent';
      },
    };
    const child = {
      toString() {
        return 'child';
      },
    };

    associateDestroyableChild(parent, child);

    registerTestDestructors(assert, 'parent', parent);
    registerTestDestructors(assert, 'child', child);

    assertLifecycle(assert, 'initialized', parent);
    assertLifecycle(assert, 'initialized', child);

    run(() => {
      destroy(parent);

      assertLifecycle(assert, 'destroying', parent);
      assertLifecycle(assert, 'destroying', child);
    });

    assertLifecycle(assert, 'destroyed', parent);
    assertLifecycle(assert, 'destroyed', child);

    assert.verifySteps(
      ['child-first', 'child-second', 'parent-first', 'parent-second'],
      'Destructors were called in correct order.'
    );

    assertDestroyablesDestroyed();
  });

  module('integration with EmberObject', function () {
    test('destroy function', function (assert) {
      assert.expect(35);

      enableDestroyableTracking();

      const parent = CoreObject.extend({
        toString() {
          return 'parent';
        },
        willDestroy() {
          assert.step('parent-willDestroy');
        },
      }).create();
      const child = CoreObject.extend({
        toString() {
          return 'child';
        },
        willDestroy() {
          assert.step('child-willDestroy');
        },
      }).create();

      associateDestroyableChild(parent, child);

      registerTestDestructors(assert, 'parent', parent);
      registerTestDestructors(assert, 'child', child);

      assertLifecycle(assert, 'initialized', parent);
      assertLifecycle(assert, 'initialized', child);

      run(() => {
        destroy(parent);

        assertLifecycle(assert, 'destroying', parent);
        assertLifecycle(assert, 'destroying', child);
      });

      assertLifecycle(assert, 'destroyed', parent);
      assertLifecycle(assert, 'destroyed', child);

      assert.verifySteps(
        [
          'child-willDestroy',
          'child-first',
          'child-second',
          'parent-willDestroy',
          'parent-first',
          'parent-second',
        ],
        'Destructors were called in correct order.'
      );

      assertDestroyablesDestroyed();
    });

    test('destroy hook', function (assert) {
      assert.expect(35);

      enableDestroyableTracking();

      const parent = CoreObject.extend({
        toString() {
          return 'parent';
        },
        willDestroy() {
          assert.step('parent-willDestroy');
        },
      }).create();
      const child = CoreObject.extend({
        toString() {
          return 'child';
        },
        willDestroy() {
          assert.step('child-willDestroy');
        },
      }).create();

      associateDestroyableChild(parent, child);

      registerTestDestructors(assert, 'parent', parent);
      registerTestDestructors(assert, 'child', child);

      assertLifecycle(assert, 'initialized', parent);
      assertLifecycle(assert, 'initialized', child);

      run(() => {
        parent.destroy();

        assertLifecycle(assert, 'destroying', parent);
        assertLifecycle(assert, 'destroying', child);
      });

      assertLifecycle(assert, 'destroyed', parent);
      assertLifecycle(assert, 'destroyed', child);

      assert.verifySteps(
        [
          'child-willDestroy',
          'child-first',
          'child-second',
          'parent-willDestroy',
          'parent-first',
          'parent-second',
        ],
        'Destructors were called in correct order.'
      );

      assertDestroyablesDestroyed();
    });
  });

  module('assertDestroyablesDestroyed', function () {
    if (gte('3.20.0-beta.4') && !gte('3.20.2')) {
      // on 3.20.0-beta.4 through 3.20.2 (estimated) there is an issue with the upstream
      // `assertDestroyablesDestroyed` method that triggers the assertion in cases that it
      // should not; in order to allow code bases to function on those specific Ember versions
      // (including our own test suite) we detect and do nothing
      //
      // See https://github.com/glimmerjs/glimmer-vm/pull/1119
      return;
    }

    test('it does not throw an error when destroyables have been destroyed', async function (assert) {
      assert.expect(1);

      enableDestroyableTracking();

      const subject = {
        toString() {
          return 'subject';
        },
      };

      registerDestructor(subject, () => {
        assert.ok(true, 'destructor should be ran');
      });

      destroy(subject);

      await settled();

      assertDestroyablesDestroyed();
    });

    test('it throws an error when destroyables not destroyed', async function (assert) {
      assert.expect(1);

      enableDestroyableTracking();

      const subject = {
        toString() {
          return 'subject';
        },
      };

      registerDestructor(subject, () => {
        assert.ok(false, 'destructor should not be ran');
      });

      assert.throws(() => {
        assertDestroyablesDestroyed();
      }, /Some destroyables were not destroyed during this test/);
    });

    test('errors if `enableDestroyableTracking` was not called previously', async function (assert) {
      assert.throws(() => {
        assertDestroyablesDestroyed();
      }, /Attempted to assert destroyables destroyed, but you did not start a destroyable test. Did you forget to call `enableDestroyableTracking\(\)`/);
    });
  });
});
