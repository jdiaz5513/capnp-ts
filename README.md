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

![npm](https://img.shields.io/npm/v/capnp-ts?color=green&style=flat-square)
![issues](https://img.shields.io/github/issues/jdiaz5513/capnp-ts?style=flat-square)

This is a TypeScript implementation of the [Cap'n Proto](https://capnproto.org) serialization protocol. Start with the [Cap'n Proto Introduction](https://capnproto.org/index.html) for more detailed information on what this is about.

- [Packages](#packages)
- [Project Status](#project-status)
- [Installation](#installation)
- [Implementation Notes](#implementation-notes)
- [Usage](#usage)
  - [Compiling Schema Files](#compiling-schema-files)
  - [Reading Messages](#reading-messages)
  - [Usage with JavaScript](#usage-with-javascript)
  - [Usage in a Web Browser](#usage-in-a-web-browser)
- [Building](#building)
  - [Initial Setup](#initial-setup)
  - [Build Tasks](#build-tasks)
- [Testing](#testing)
- [Team](#team)

## Packages

This repository is managed as a monorepo composed of separate packages.

| Package                            | Version                                                                      | Dependencies                                                                                                      |
| :--------------------------------- | :--------------------------------------------------------------------------- | :---------------------------------------------------------------------------------------------------------------- |
| [`capnp-ts`](/packages/capnp-ts)   | ![npm](https://img.shields.io/npm/v/capnp-ts) | ![dependency status](https://img.shields.io/librariesio/release/npm/capnp-ts) |
| [`capnpc-ts`](/packages/capnpc-ts) | ![npm](https://img.shields.io/npm/v/capnpc-ts) | ![dependency status](https://img.shields.io/librariesio/release/npm/capnpc-ts) |

- `capnp-ts` is the core Cap'n Proto library for Typescript. It is a required import for all compiled schema files, and the starting point for reading/writing a Cap'n Proto message.
- `capnpc-ts` is the schema compiler plugin for TypeScript. It is intended to be invoked by the [`capnp`](https://capnproto.org/capnp-tool.html) tool.

## Project Status

This project is under active **beta** stage development.

- Serialization: **reference quality with tests for byte-identical output**
- Schema Compiler: **all serialization features fully supported**
- [RPC Level 1](https://capnproto.org/rpc.html#protocol-features): **not implemented**
- [RPC Level 2](https://capnproto.org/rpc.html#protocol-features): **not implemented**
- [RPC Level 3](https://capnproto.org/rpc.html#protocol-features): **not implemented**
- [RPC Level 4](https://capnproto.org/rpc.html#protocol-features): **not implemented**

## Installation

Grab the latest library version from npm:

```shell
npm install --save capnp-ts
```

You will need the schema compiler as well (global installation recommended):

```shell
npm install -g capnpc-ts # For TypeScript
```

The schema compiler is a [Cap'n Proto plugin](https://capnproto.org/otherlang.html#how-to-write-compiler-plugins) and requires the `capnpc` binary in order to do anything useful; follow the [Cap'n Proto installation instructions](https://capnproto.org/install.html) to install it on your system.

## Implementation Notes

> These notes are provided for people who are familiar with the C++ implementation, or implementations for other languages. Those who are new to Cap'n Proto may skip this section.

This implementation differs in a big way from the C++ reference implementation: there are no separate Builder or Reader classes. All pointers are essentially treated as Builders.

This has some major benefits for simplicity's sake, but there is a bigger reason for this decision (which was not made lightly). Everything is backed by `ArrayBuffer`s and there is no practical way to prevent mutating the data, even in a dedicated Reader class. The result of such mutations could be disastrous, and more importantly there is no way to reap much performance from making things read-only.

## Usage

### Compiling Schema Files

Run the following to compile a schema file into TypeScript source code:

```shell
capnpc -o ts path/to/myschema.capnp
```

Running that command will create a file named `path/to/myschema.capnp.ts`.

> These instructions assume `capnpc-ts` was installed globally and is available from `$PATH`. If not, change the `-o` option to something like `-o node_modules/.bin/capnpc-ts` or `-o capnp-ts/packages/capnpc-ts/bin/capnpc-ts.js` so it points to your local `capnpc-ts` install.

To write the compiled source to a different directory:

```shell
capnpc -o ts:/tmp/some-dir/ path/to/myschema.capnp
```

That will generate a file at `/tmp/some-dir/path/to/myschema.capnp.ts`.

### Reading Messages

To read a message, do something like the following:

```typescript
import * as capnp from "capnp-ts";

import { MyStruct } from "./myschema.capnp.js";

export function loadMessage(buffer: ArrayBuffer): MyStruct {
  const message = new capnp.Message(buffer);

  return message.getRoot(MyStruct);
}
```

### Usage with JavaScript

JavaScript usage is nearly identical to the TypeScript version, except you won't get all of the type safety and code completion goodness in your editor.

Also, the name `capnp-js` is already reserved on npm from a [previous attempt by another author](https://www.npmjs.com/package/capnp-js) so you'll be importing `capnp-ts` instead.

```javascript
const capnp = require("capnp-ts");

const MyStruct = require("./myschema.capnp.js").MyStruct;

function loadMessage(buffer) {
  const message = new capnp.Message(buffer);

  return message.getRoot(MyStruct);
}
```

A larger example is located in the js-examples directory.

### Usage in a Web Browser

Using a tool like [webpack](https://webpack.js.org/) one should be able to bundle the library and compiled schema files for use in a web browser.

A deliberate effort was made to avoid using nodejs specific features (at the expense of performance) to maintain compatibility with browser environments.

**Note that this library does not yet run test cases for web browsers, though it is technically supported as a runtime target.**

> In the future a special nodejs-only version of the library may be released to take advantage of `Buffer` which gives access to unsafe malloc style allocation (as opposed to calloc style allocation in `ArrayBuffer` which always zeroes out the memory).

## Building

Before building the source you will need a few prerequisites which can be managed automatically by using [nix](https://nixos.org) and [direnv](https://direnv.net),

### Initial Setup

Run `direnv allow` to set up system dependencies and the **node_modules** directories for the monorepo and each package. Or, with just nix installed:

```shell
nix develop .
```

### Build Targets

The following makefile targets are available for build tasks.

To build the library and schema files simply run make with no arguments:

```shell
make 
```

---

#### `benchmark`

Runs all available benchmarks in `packages/capnp-ts-test/test/benchmark`.

#### `build`

Compiles the typescript sources and test files.

#### `coverage`

Generates a coverage report.

#### `lint`

Runs `eslint` and prints out any linter violations.

#### `release`

Create a new release; use this to trigger a continuous deployment run after pushing the new tag.

#### `test`

Runs the test suite and prints out a human-readable test result.

#### `watch`

Runs the tap REPL which allows running the tests in watch mode as well as other features.

## Testing

Tests are written using [node-tap](http://www.node-tap.org/) and are located in the `test/` subdirectory for each package. The goal for this repository is to reach 100% coverage on critical code.

The `packages/capnp-ts-test/test/parity/` integration suite additionally verifies byte-exact compatibility against the C++ reference implementation by invoking the `capnp` binary. All test suites run hermetically under `nix flake check` (as well as basic flake-level checks).

## Debugging

Some debug trace functionality is provided by the [debug](https://www.npmjs.com/package/debug) library.

To see trace messages in nodejs, export the following environment variable:

```bash
export DEBUG='capnp*'
```

When running in a web browser, use `localStorage` to enable debug output:

```javascript
localStorage.debug = "capnp*";
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
