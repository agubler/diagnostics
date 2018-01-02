# @dojo/diagnostics

[![Build Status](https://travis-ci.org/dojo/diagnostics.svg?branch=master)](https://travis-ci.org/dojo/diagnostics)
[![codecov](https://codecov.io/gh/dojo/diagnostics/branch/master/graph/badge.svg)](https://codecov.io/gh/dojo/diagnostics)
[![npm version](https://badge.fury.io/js/dojo-diagnostics.svg)](http://badge.fury.io/js/dojo-diagnostics)

Modules for providing diagnostics for Dojo 2 applications.

## Features

### Diagnostic API

The main purpose of this package is to enable a diagnostic by using the included wrappers to instrument common parts of a Dojo 2
application.  These wrappers issue events which then are exposed via the diagnostic API.  The `main` module of this package exports
the API but also exposes it under a global variable named `__dojo2_diagnostics__`.

The Dojo 2 [devtool](https://github.com/dojo/devtool) provides an user interface to this API.  The API can also be accessed via a
browsers development console.

If you want to instrument your application, you would simply want to load the `main` module for its side-effects.  For example, if
you used `dojo create app` to scaffold your application, you would want to add `@dojo/diagnostics` as a dependency and in your
`src/main.ts` you would import the main module:

```ts
import '@dojo/diagnostics/main';
```

Once you build and load the application, you should now be able to access the diagnostic API via the `__dojo2_diagnostics__` variable.

#### Properties

The diagnostic API currently provides the following properties:

|Property|Default|Description|
|--------|-------|-----------|
|`eventLog`|_EventLogRecord[]_|An array of diagnostic events|
|`eventLogDepth`|_100_|The number of events to retain in memory|
|`highlightOutline`|`1px dashed #006be6`|When highlighting nodes, the outline for the highlighted node|
|`highlightBackgroundColor`|`rgba(0,107,230,0.1)`|When highlighting nodes, the background f the highlighted node|
|`version`| |The current version of the API|

#### Methods

The diagnostic API currently provides the following methods:

|Method|Arguments|Return|Description|
|------|---------|------|-----------|
|`getDomNode`|_projector: string, path: string_|_HTMLElement | undefined_|Returns a reference to an HTML Element described by the virtual DOM node.|
|`getProjectorLastRender`|_projector: string_|_SerializedDNode_|A special version of a virtual DOM node that can be easily serialized.|
|`getProjectorRenderLog`|_projector: string_|_RenderLogRecord[]_|Return a specialized log of renders for the named projector|
|`getProjectors`| |_string[]_|Get the names of the currently available diagnostic projectors|
|`getStores`| |_string[]_|Get the names of the currently available diagnostic stores|
|`getStoreTransactionLengths`|_store: string_|_{ history: number; redo: number}_|Get information about the number of command transactions currently available for a store|
|`getStoreState`|_store: string_|_any_|Return the current full state of a store|
|`highlight`|_projector: string, path: string_|_void_|Highlight the identified HTML Element|
|`storeTravel`|_store: string, distance: number_|_PatchOperation[]_|Time travel the state of the named store.  Negative numbers rollback the history stack, while positive numbers replay the redo stack.|
|`unhighlight`| |_void_|Unhighlight any currently highlighted DOM node.|

### Wrappers

The main way diagnostic information is collected is by _wrapping_ existing Dojo 2 modules and providing replacement modules that
have the same _shape_ as those modules they are wrapping.

#### Projector

The `@dojo/diagnostic/Projector` module wraps the `@dojo/widget-core/mixins/Projector` module, providing an instrumented replacement.
This enables the diagnostic API to provide information about the virtual DOM of your application.  To enable it, you would replace the
original module with the diagnostic one.  In a typical Dojo 2 application, you would replace the following line in `src/main.ts`:

```diff
-import { ProjectorMixin } from '@dojo/widget-core/mixins/Projector';
+import { ProjectorMixin } from '@dojo/diagnostics/wrappers/Projector';
```

The wrapper will add a public property named `.name` to any projector instances.  The wrapper will automatically generate a name
for each projector that is created, but this can be used to make it easier to debug an application by giving projectors specific
names.

#### Store

The `@dojo/diagnostic/Store` module wraps the `@dojo/stores/Store` module, providing an instrumented replacement.  This enables the
diagnostic API to provide information about the state of a store.  To enable it, you would replace the original module with the
diagnostic one.  In a typical Dojo 2 application, you would replace the following line:

```diff
-import Store from '@dojo/stores/Store';
+import Store from '@dojo/diagnostics/wrappers/Store';
```

The wrapper will add a public property name `.name` to any store instances.  The wrapper will automatically generate a name for each
store that is created, but this can be used t make it easier to debug an application by giving stres speicfic names.

## How Do I Contribute?

We appreciate your interest! Please see the [Dojo 2 Meta Repository](https://github.com/dojo/meta#readme)
for the Contributing Guidelines.

### Code Style

This repository uses [`prettier`](https://prettier.io/) for code styling rules and formatting. A pre-commit hook is installed automatically and configured to run `prettier` against all staged files as per the configuration in the projects `package.json`.

An additional npm script to run `prettier` (with write set to `true`) against all `src` and `test` project files is available by running:

```bash
npm run prettier
```

## Testing

Test cases MUST be written using [Intern](https://theintern.github.io) using the Object test interface and Assert assertion interface.

90% branch coverage MUST be provided for all code submitted to this repository, as reported by istanbul’s combined coverage results for all supported platforms.

To test locally in node run:

`grunt test`

To test against browsers with a local selenium server run:

`grunt test:local`

To test against BrowserStack or Sauce Labs run:

`grunt test:browserstack`

or

`grunt test:saucelabs`

## Licensing information

TODO: If third-party code was used to write this library, make a list of project names and licenses here

* [Third-party lib one](https//github.com/foo/bar) ([New BSD](http://opensource.org/licenses/BSD-3-Clause))

© [JS Foundation](https://js.foundation/) & contributors. [New BSD](http://opensource.org/licenses/BSD-3-Clause) and [Apache 2.0](https://opensource.org/licenses/Apache-2.0) licenses.
