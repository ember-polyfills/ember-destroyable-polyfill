(function() {
  if (!require.has('@ember/destroyable')) {
    define.alias('ember-destroyable-polyfill', '@ember/destroyable');

    setTimeout(function () {
      require('ember-destroyable-polyfill/-internal/patch-meta');
      require('ember-destroyable-polyfill/-internal/patch-core-object');
    }, 0);
  }
})();
