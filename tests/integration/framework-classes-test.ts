import { render, clearRender } from '@ember/test-helpers';
import { setupRenderingTest } from 'ember-qunit';
import { module, test } from 'qunit';

import EmberComponent from '@ember/component';
import Helper from '@ember/component/helper';
import { registerDestructor } from '@ember/destroyable';
import GlimmerComponent from '@glimmer/component';

import { hbs } from 'ember-cli-htmlbars';
import { gte } from 'ember-compatibility-helpers';
// eslint-disable-next-line @typescript-eslint/ban-ts-ignore
// @ts-ignore
import Modifier from 'ember-modifier';

module('Framework Classes Integration', function (hooks) {
  setupRenderingTest(hooks);

  if (gte('3.8.0')) {
    test('GlimmerComponent', async function (assert) {
      this.owner.register(
        'component:dummy',
        class DummyComponent extends GlimmerComponent {
          constructor(owner: unknown, args: {}) {
            super(owner, args);

            registerDestructor(this, () => assert.step('destructor'));
          }
        }
      );

      await render(hbs`<Dummy />`);
      await clearRender();

      assert.verifySteps(['destructor']);
    });
  }

  test('EmberComponent', async function (assert) {
    this.owner.register(
      'component:dummy',
      class DummyComponent extends EmberComponent {
        constructor(properties?: object) {
          super(properties);

          registerDestructor(this, () => assert.step('destructor'));
        }
      }
    );

    await render(hbs`<Dummy />`);
    await clearRender();

    assert.verifySteps(['destructor']);
  });

  test('Helper', async function (assert) {
    this.owner.register(
      'helper:dummy',
      class DummyHelper extends Helper {
        constructor(properties?: object) {
          super(properties);

          registerDestructor(this, () => assert.step('destructor'));
        }

        compute() {}
      }
    );

    await render(hbs`{{dummy}}`);
    await clearRender();

    assert.verifySteps(['destructor']);
  });

  test('Modifier', async function (assert) {
    this.owner.register(
      'modifier:dummy',
      class DummyHelper extends Modifier {
        constructor(properties?: object) {
          super(properties);

          registerDestructor(this, () => assert.step('destructor'));
        }
      }
    );

    await render(hbs`<span {{dummy}}></span>`);
    await clearRender();

    assert.verifySteps(['destructor']);
  });
});
