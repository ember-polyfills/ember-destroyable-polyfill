# ember-destroyable-polyfill

[![CI](https://github.com/ember-polyfills/ember-destroyable-polyfill/workflows/CI/badge.svg)](https://github.com/ember-polyfills/ember-destroyable-polyfill/actions)
[![npm version](https://badge.fury.io/js/ember-destroyable-polyfill.svg)](http://badge.fury.io/js/ember-destroyable-polyfill)
[![Download Total](https://img.shields.io/npm/dt/ember-destroyable-polyfill.svg)](http://badge.fury.io/js/ember-destroyable-polyfill)
[![Ember Observer Score](https://emberobserver.com/badges/ember-destroyable-polyfill.svg)](https://emberobserver.com/addons/ember-destroyable-polyfill)
[![code style: prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg)](https://github.com/prettier/prettier)  
[![Dependabot enabled](https://img.shields.io/badge/dependabot-enabled-blue.svg?logo=dependabot)](https://dependabot.com/)
[![dependencies Status](https://david-dm.org/ember-polyfills/ember-destroyable-polyfill/status.svg)](https://david-dm.org/ember-polyfills/ember-destroyable-polyfill)
[![devDependencies Status](https://david-dm.org/ember-polyfills/ember-destroyable-polyfill/dev-status.svg)](https://david-dm.org/ember-polyfills/ember-destroyable-polyfill?type=dev)

Polyfill for [RFC 580 "Destroyables"][rfc-580].

[rfc-580]: https://github.com/emberjs/rfcs/pull/580

## Installation

```bash
ember install ember-destroyable-polyfill
```

For addons, pass the `-S` flag.

## Summary

Adds an API for registering destroyables and destructors with Ember's built in
destruction hierarchy.

```js
import { registerDestructor } from '@ember/destroyable';

class MyComponent extends Component {
  constructor() {
    let timeoutId = setTimeout(() => console.log('hello'), 1000);
    registerDestructor(this, () => clearTimeout(timeoutId));
  }
}
```

The API will also enable users to create and manage their own destroyables, and
associate them with a parent destroyable.

```js
import {
  associateDestroyableChild,
  registerDestructor
} from '@ember/destroyable';

class TimeoutManager {
  constructor(parent, fn, timeout = 1000) {
    let timeoutId = setTimeout(fn, timeout);
    associateDestroyableChild(parent, this);
    registerDestructor(this, () => clearTimeout(timeoutId));
  }
}

class MyComponent extends Component {
  manager = new TimeoutManager(this, () => console.log('hello'));
}
```

For detailed usage instructions, refer to the
[RFC 580 "Destroyables"][rfc-580].
