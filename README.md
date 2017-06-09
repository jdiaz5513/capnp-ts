```
      ██████╗ █████╗ ██████╗ ██╗███╗   ██╗    
     ██╔════╝██╔══██╗██╔══██╗██║████╗  ██║    
     ██║     ███████║██████╔╝╚═╝██╔██╗ ██║    
     ██║     ██╔══██║██╔═══╝    ██║╚██╗██║    
     ╚██████╗██║  ██║██║        ██║ ╚████║    
      ╚═════╝╚═╝  ╚═╝╚═╝        ╚═╝  ╚═══╝    
 ██████╗ ██████╗  ██████╗ ████████╗ ██████╗ 
 ██╔══██╗██╔══██╗██╔═══██╗╚══██╔══╝██╔═══██╗
 ██████╔╝██████╔╝██║   ██║   ██║   ██║   ██║
 ██╔═══╝ ██╔══██╗██║   ██║   ██║   ██║   ██║
 ██║     ██║  ██║╚██████╔╝   ██║   ╚██████╔╝
 ╚═╝     ╚═╝  ╚═╝ ╚═════╝    ╚═╝    ╚═════╝ 

                         infinitely
                           faster!

-- TypeScript Edition

```

![travis ci](https://travis-ci.org/jdiaz5513/capnp-ts.svg?branch=master) [![codecov](https://codecov.io/gh/jdiaz5513/capnp-ts/branch/master/graph/badge.svg)](https://codecov.io/gh/jdiaz5513/capnp-ts)

This is a TypeScript implementation of the [Cap'n Proto](https://capnproto.org) serialization protocol. Start with the [Cap'n Proto Introduction](https://capnproto.org/index.html) for more detailed information on what this is about.

> WARNING: THIS IS PRE-ALPHA SOFTWARE. USE AT YOUR OWN RISK. AUTHORS ARE NOT RESPONSIBLE FOR LOSS OF LIMB, LIFE, SANITY, OR RETIREMENT FUNDS DUE TO USE OF THIS SOFTWARE.

- [Packages](#packages)
- [Project Status](#project-status)
- [Installation](#installation)
- [Usage](#usage)
  - [Usage with JavaScript](#usage-with-javascript)
  - [Usage in a Web Browser](#usage-in-a-web-browser)
- [Building](#building)
  - [Build Targets](#build-targets)
- [Testing](#testing)
- [Team](#team)

## Packages

This repository is managed as a monorepo composed of separate packages.

| Package | Version | Dependencies |
|:--------|:--------|:-------------|
| [`capnp-ts`](/packages/capnp-ts) | [![npm](https://img.shields.io/npm/v/capnp-ts.svg?maxAge=2592000)](https://www.npmjs.com/package/capnp-ts) | [![Dependency Status](https://david-dm.org/jdiaz5513/capnp-ts.svg?path=packages/capnp-ts)](https://david-dm.org/jdiaz5513/capnp-ts?path=packages/capnp-ts) |
| [`capnpc-ts`](/packages/capnpc-ts) | [![npm](https://img.shields.io/npm/v/capnpc-ts.svg?maxAge=2592000)](https://www.npmjs.com/package/capnpc-ts) | [![Dependency Status](https://david-dm.org/jdiaz5513/capnpc-ts.svg?path=packages/capnpc-ts)](https://david-dm.org/jdiaz5513/capnpc-ts?path=packages/capnpc-ts) |

- `capnp-ts` is the core Cap'n Proto library for Typescript. It is a required import for all compiled schema files, and the starting point for reading/writing a Cap'n Proto message.
- `capnpc-ts` is the schema compiler. It is intended to be invoked by the [`capnp`](https://capnproto.org/capnp-tool.html) tool.

## Project Status

This project is under active **pre-alpha** development.

> Until version `1.x.x` lands expect that the top level API **will** change.

- Serialization: **mostly implemented**
- Schema Compiler: **partially implemented**
- [RPC Level 1](https://capnproto.org/rpc.html#protocol-features): **not implemented**
- [RPC Level 2](https://capnproto.org/rpc.html#protocol-features): **not implemented**
- [RPC Level 3](https://capnproto.org/rpc.html#protocol-features): **not implemented**
- [RPC Level 4](https://capnproto.org/rpc.html#protocol-features): **not implemented**

## Installation

Grab the latest library version from npm:

```shell
npm install --save capnp-ts
```

You may want the schema compiler as well (can also be installed locally):

```shell
npm install -g capnpc-ts
```

The schema compiler is a [Cap'n Proto plugin](https://capnproto.org/otherlang.html#how-to-write-compiler-plugins) and requires the `capnpc` binary in order to do anything useful; follow the [Cap'n Proto installation instructions](https://capnproto.org/install.html) to install it on your system.

> NOTE: At some point in the future the `capnpc-ts` package may build the `capnpc` binary as a native dependency, making this step somewhat unnecessary.

## Usage

Run the following to compile a schema file into Typescript source code:

```shell
capnpc -ots path/to/myschema.capnp
```

Running that command will create a file named `path/to/myschema.capnp.ts`.

> This assumes `capnpc-ts` was installed globally and is available from `$PATH`. If not, change the `-o` option to something like `-onode_modules/.bin/capnpc-ts` so it points to your local `capnpc-ts` install.

To read a message, do something like the following:

```typescript
import * as capnp from 'capnp-ts';

import {MyStruct} from './myschema.capnp';

export function loadMessage(buffer: ArrayBuffer): MyStruct {

  const message = capnp.Message.fromArrayBuffer(buffer);

  return message.getRoot(MyStruct);

}
```

### Usage with JavaScript

JavaScript is not **yet** fully supported; the `capnp-ts` library itself can be imported as ES5 JavaScript, but the schema compiler is not yet able to transpile the emitted TypeScript schema file into JavaScript. One may do so manually, if feeling particularly adventurous.

### Usage in a Web Browser

Using a tool like [webpack](https://webpack.js.org/) one should be able to bundle the library and compiled schema files for use in a web browser.

A deliberate effort was made to avoid using nodejs specific features (at the expense of performance) to maintain compatibility with browser environments.

**Note that this has not yet been tested.**

In the future a special nodejs version of the library may be released 

## Building

Before building the source you will need a few prerequisites:

- [**nodejs**](https://nodejs.org/en/) (latest LTS or 8.x.x is recommended)
- [**make**](https://www.gnu.org/software/make/)
  - Ubuntu/Debian:
    ```shell
    sudo apt-get install build-essential
    ```
  - macOS: [install the Xcode command line tools](https://developer.apple.com/library/content/technotes/tn2339/_index.html)
  - Windows: **not yet supported!**

> [nvm](https://github.com/creationix/nvm) is highly recommended for managing multiple nodejs versions.

### Build Targets

Nearly everything build related is managed through the **Makefile**. The following targets are available as a convenience:

#### `make build` (default target)

Compiles the typescript sources and test files.

#### `make benchmark`

Runs all available benchmarks in `packages/capnp-ts/test/benchmark`.

#### `make capnp-compile`

Compiles all `.capnp` files into Typescript source. This is done automatically by `build` and should only be run manually if you're making changes to the `.capnp` schema files.

#### `make ci`

Used by Travis for continuous integration testing; do not run locally.

#### `make clean`

Cleans all build output and linked modules (`**/lib/**/*` and `**/lib-test/**/*`).

#### `make coverage`

Generates a coverage report and opens it in a new web browser tab.

#### `make lint`

Runs `tslint` and prints out any linter violations.

#### `make test`

Runs the test suite and prints out a human-readable test result.

#### `make watch`

Runs the test suite in a loop, recompiling any changes to the source as it is saved to disk.

## Testing

Tests are written using [node-tap]() and are located in the `test/` subdirectory for each package. The goal for this repository is to reach 100% coverage on critical code. Exceptions may be made (e.g. for benchmark code) using special istanbul comments:

```javascript
/* istanbul ignore next */    // ignore the next statement/block
/* istanbul ignore if */      // ignore an if branch
/* istanbul ignore else */    // ignore an else branch
```

## Debugging

Some debug trace functionality is provided by the [debug](https://www.npmjs.com/package/debug) library.

To see trace messages in nodejs, export the following environment variable:

```bash
export DEBUG='capnp*'
```

When running in a web browser, use `localStorage` to enable debug output:

```javascript
localStorage.debug = 'capnp*';
```

Trace messages can get rather noisy, so tweak the `DEBUG` variable as you see fit.

All messages also have a handy `.dump()` method that returns a hex dump of the first 8 KiB for each segment in the message:

```
> console.log(message.dump());

================
Segment #0
================

=== buffer[64] ===
00000000: 00 00 00 00 00 00 00 00  00 00 00 00 00 00 00 00 ················
00000010: 00 00 00 00 00 00 00 00  00 00 00 00 00 00 00 00 ················
00000020: 00 00 00 00 00 00 00 00  00 00 00 00 00 00 00 00 ················
00000030: 00 00 00 00 00 00 00 00  00 00 00 00 00 00 00 00 ················
```

## Team

Check out the [Humans Colophon](/HUMANS.md) for contributor credits.

## License

[MIT](/LICENSE.md)
