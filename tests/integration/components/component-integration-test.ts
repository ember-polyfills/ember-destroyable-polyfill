import { render, settled, clearRender } from '@ember/test-helpers';
import { setupRenderingTest } from 'ember-qunit';
import { module, test } from 'qunit';

import EmberComponent from '@ember/component';
import { registerDestructor } from '@ember/destroyable';
import { begin, end } from '@ember/runloop';
import GlimmerComponent from '@glimmer/component';

import { hbs } from 'ember-cli-htmlbars';

module('component-integration', function (hooks) {
  setupRenderingTest(hooks);

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
});
