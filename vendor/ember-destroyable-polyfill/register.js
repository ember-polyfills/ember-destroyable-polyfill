(function() {
  if (!require.has('@ember/destroyable')) {
    setTimeout(function () {
      require('ember-destroyable-polyfill/-internal/patch-meta');
      require('ember-destroyable-polyfill/-internal/patch-core-object');

      var destroyables = require('ember-destroyable-polyfill');

      Ember.destroy = destroyables.destroy;
      Ember._registerDestructor = destroyables.registerDestructor;
      Ember._unregisterDestructor = destroyables.unregisterDestructor;
      Ember._associateDestroyableChild = destroyables.associateDestroyableChild;
      Ember._assertDestroyablesDestroyed = destroyables.assertDestroyablesDestroyed;
      Ember._enableDestroyableTracking = destroyables.enableDestroyableTracking;
      Ember._isDestroying = destroyables.isDestroying;
      Ember._isDestroyed = destroyables.isDestroyed;
    }, 0);
  }
})();
