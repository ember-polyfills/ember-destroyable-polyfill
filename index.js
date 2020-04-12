'use strict';

const VersionChecker = require('ember-cli-version-checker');
const NATIVE_SUPPORT_VERSION = '4.0.0'; // @TODO set correct version, once support is available
let hasBeenWarned = false;

module.exports = {
  name: require('./package').name,
  included(...args) {
    // eslint-disable-next-line unicorn/prefer-reflect-apply
    this._super.included.apply(this, args);
    this._ensureThisImport();

    const checker = new VersionChecker(this);
    const emberVersion = checker.for('ember-source');

    if (emberVersion.lt('4.0.0')) {
      this.import('vendor/ember-destroyable-polyfill/register.js');
    } else if (this.parent === this.project && !hasBeenWarned) {
      this.ui.writeWarnLine(
        `${this.name} is not required for Ember ${NATIVE_SUPPORT_VERSION} and later, please remove from your 'package.json'.`
      );
      hasBeenWarned = true;
    }
  },

  _ensureThisImport() {
    if (!this.import) {
      this._findHost = function findHostShim() {
        let current = this;
        let app;
        do {
          app = current.app || app;
          // eslint-disable-next-line no-cond-assign
        } while (current.parent.parent && (current = current.parent));
        return app;
      };
      this.import = function importShim(asset, options) {
        const app = this._findHost();
        app.import(asset, options);
      };
    }
  }
};
