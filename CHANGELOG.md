# Changelog

All notable changes to this project will be documented in this file. Entries are drafted from [Conventional Commits](https://www.conventionalcommits.org) by the release script (`nix run .#release`).

## [0.9.3](https://github.com/jdiaz5513/capnp-ts/compare/v0.9.2...v0.9.3) (2026-08-20)

### Features

* flatten interface inheritance into generated clients and servers (#200) ([bdb765e](https://github.com/jdiaz5513/capnp-ts/commit/bdb765e7c3cfeb6f0d3b85e7dd59888edde14371))

## [0.9.2](https://github.com/jdiaz5513/capnp-ts/compare/v0.9.1...v0.9.2) (2026-08-01)

### Features

* add support for annotations (#195) ([f0538f4](https://github.com/jdiaz5513/capnp-ts/commit/f0538f4ebf5f56a4a5107c61f6901d459c20086a))

### Bug Fixes

* exclude TypeScript source files from npm tarballs (#194) ([afd475e](https://github.com/jdiaz5513/capnp-ts/commit/afd475e535fbf1303e9ad6af48fbb02a50c68b33))

## [0.9.1](https://github.com/jdiaz5513/capnp-ts/compare/v0.9.0...v0.9.1) (2026-08-01)

### Features

* namespace aliases for nested declarations (#44) (#193) ([813032e](https://github.com/jdiaz5513/capnp-ts/commit/813032e93744d49ead7ac0a03a639231461737da))

### Bug Fixes

* emit file scoped constants correctly (#190) ([92840b5](https://github.com/jdiaz5513/capnp-ts/commit/92840b5a4011ca91609fbdb4fdbfd87f8911cdfd))
* emit valid paths for absolute schema imports (#191) ([942c9d6](https://github.com/jdiaz5513/capnp-ts/commit/942c9d605ae3e870428d73a6f12fd9027bc014d1))
* encode unpaired UTF-8 surrogates as U+FFFD (#192) ([4514392](https://github.com/jdiaz5513/capnp-ts/commit/45143923abd26c50a745b618c1fb05e0ce130092))

## [0.9.0](https://github.com/jdiaz5513/capnp-ts/compare/v0.8.0...v0.9.0) (2026-07-09)

### ⚠ BREAKING CHANGES
* `capnpc-ts` is refactored to use templated code generation rather than direct AST manipulation. Emitted code is call-compatible at the API level; most of the changes are additions.
* Structs now have `.set` and `.toJSON` instance methods as well as property setters/getters for all JSON-compatible fields. Depending on the schema there is a risk of name collision (which will be flagged as a type error) when upgrading to this version.

### Features

* RPC Level 1 runtime added with a reference WebSocket transport.
* Promise pipelining: calls on unreturned results (before `await`) use only one round trip for the whole call chain.  
* Full support for interface code generation with `Client`/`Server`/`RemotePromise` classes.
* Generic interfaces and structs: brand resolution at codegen with runtime binding of constructors and fully typed RemotePromise pipelines.
* JSON support for generated structs with `.toJSON()` and generic `.set({ stringField: "bar" })` instance methods.
* Property accessors for all generated structs (can replace calls to `obj.setA(0)` with `obj.a = 0`).
* Expanded test coverage including WebSocket round trip client/server testing.
* Serialization round trip and RPC conformance tests added to compare output byte-for-byte with the C++ implementation.

## [0.8.0](https://github.com/jdiaz5513/capnp-ts/compare/v0.7.0...v0.8.0) (2026-07-09)


### ⚠ BREAKING CHANGES

* `capnpc-ts` now uses the 6.0 version of the TypeScript compiler. Changes to emitted code should be minimal if any.
* `capnp-js` and `capnp-ts` now targets the latest NodeJS LTS (v24) for testing and supports up to v20.
* `SharedArrayBuffer` is now explicitly not supported with a runtime check.

### Bug Fixes

* increase traverse limit for large capnp files to 128MB ([0b7d322](https://github.com/jdiaz5513/capnp-ts/commit/0b7d3223d5ba951d7ab102e25d315ed8d77d9cfc))
* remove redundant _capnp declaration causing vite build errors ([64d1ee9](https://github.com/jdiaz5513/capnp-ts/commit/64d1ee942ec620412e5d7d8f05a8e7ae8833b943))

## [0.7.0](https://github.com/jdiaz5513/capnp-ts/compare/v0.5.1...v0.7.0) (2021-08-19)


### ⚠ BREAKING CHANGES

* `capnpc-js` is being retired in favor of compiling
directly to js from `capnpc-ts` instead. This makes the one compiler
serve both purposes; js-only users who are annoyed by the extra d.ts
files may simply delete them. This was done to work around bugs in
source-map-support that prevent importing capnp.js files when a
capnp.ts file is also present.

### Bug Fixes

* support imports with nested enums ([64778e0](https://github.com/jdiaz5513/capnp-ts/commit/64778e0ea65f0221498c9c8b47708ed5e18e14d2))

## [0.6.0](https://github.com/jdiaz5513/capnp-ts/compare/v0.5.1...v0.6.0) (2021-08-19)


### ⚠ BREAKING CHANGES

* `capnpc-js` is being retired in favor of compiling
directly to js from `capnpc-ts` instead. This makes the one compiler
serve both purposes; js-only users who are annoyed by the extra d.ts
files may simply delete them. This was done to work around bugs in
source-map-support that prevent importing capnp.js files when a
capnp.ts file is also present.

### Bug Fixes

* support imports with nested enums ([64778e0](https://github.com/jdiaz5513/capnp-ts/commit/64778e0ea65f0221498c9c8b47708ed5e18e14d2))

### [0.5.1](https://github.com/jdiaz5513/capnp-ts/compare/v0.5.0...v0.5.1) (2021-08-18)


### Bug Fixes

* resolve build failures and readme inaccuracies ([#165](https://github.com/jdiaz5513/capnp-ts/issues/165)) ([0114b10](https://github.com/jdiaz5513/capnp-ts/commit/0114b10aab255ab1ad7aaa8a4f2f784a754596ae))
* run ci workflow on master ([68a9c8d](https://github.com/jdiaz5513/capnp-ts/commit/68a9c8d4041fb8023eeb1cf9649f9f25b44885eb))
* use correct branch in cd workflow ([1664197](https://github.com/jdiaz5513/capnp-ts/commit/1664197ddae62ec9d3aeba2f9e78c9dccee1d47d))

## [0.5.0](https://github.com/jdiaz5513/capnp-ts/compare/v0.4.0...v0.5.0) (2021-08-18)


### Bug Fixes

* upgrade outdated packages, revert to makefile ([#159](https://github.com/jdiaz5513/capnp-ts/issues/159)) ([c629dad](https://github.com/jdiaz5513/capnp-ts/commit/c629dadbda0e280c63cc4582c772b86445ba1d69))

<a name="0.4.0"></a>
# [0.4.0](https://github.com/jdiaz5513/capnp-ts/compare/v0.3.1...v0.4.0) (2018-09-26)


### Bug Fixes

* revert botched import paths ([#111](https://github.com/jdiaz5513/capnp-ts/issues/111)) ([e280020](https://github.com/jdiaz5513/capnp-ts/commit/e280020))


### Features

* **compiler:** add support for capnpc v0.7.0 ([#110](https://github.com/jdiaz5513/capnp-ts/issues/110)) ([22bd14d](https://github.com/jdiaz5513/capnp-ts/commit/22bd14d))





<a name="0.3.1"></a>
## [0.3.1](https://github.com/jdiaz5513/capnp-ts/compare/v0.3.0...v0.3.1) (2018-09-25)


### Bug Fixes

* **serialization:** fix parse crash on null pointer dereference in resize ([#107](https://github.com/jdiaz5513/capnp-ts/issues/107)) ([3f8b307](https://github.com/jdiaz5513/capnp-ts/commit/3f8b307)), closes [#78](https://github.com/jdiaz5513/capnp-ts/issues/78)





<a name="0.3.0"></a>
# [0.3.0](https://github.com/jdiaz5513/capnp-ts/compare/v0.2.4...v0.3.0) (2018-08-29)


### Bug Fixes

* **build:** avoid use of debug script for capnpc build step ([#101](https://github.com/jdiaz5513/capnp-ts/issues/101)) ([f1d606a](https://github.com/jdiaz5513/capnp-ts/commit/f1d606a))
* **build:** hoist js-examples to packages directory ([#103](https://github.com/jdiaz5513/capnp-ts/issues/103)) ([8604fec](https://github.com/jdiaz5513/capnp-ts/commit/8604fec))
* **compiler:** change order of comment and tslint:disable ([#94](https://github.com/jdiaz5513/capnp-ts/issues/94)) ([b37a342](https://github.com/jdiaz5513/capnp-ts/commit/b37a342))
* add debug as direct dependency of capnpc-ts ([#105](https://github.com/jdiaz5513/capnp-ts/issues/105)) ([90643ce](https://github.com/jdiaz5513/capnp-ts/commit/90643ce))
* **serialization:** set instance variables before they may be referenced ([#106](https://github.com/jdiaz5513/capnp-ts/issues/106)) ([21deff5](https://github.com/jdiaz5513/capnp-ts/commit/21deff5))


### Features

* **compiler:** implement remaining serialization features ([#98](https://github.com/jdiaz5513/capnp-ts/issues/98)) ([524b6bd](https://github.com/jdiaz5513/capnp-ts/commit/524b6bd))





<a name="0.2.4"></a>
## [0.2.4](https://github.com/jdiaz5513/capnp-ts/compare/v0.2.3...v0.2.4) (2017-11-24)


### Bug Fixes

* **build:** do not emit UMD modules ([#87](https://github.com/jdiaz5513/capnp-ts/issues/87)) ([157d1d9](https://github.com/jdiaz5513/capnp-ts/commit/157d1d9))




      <a name="0.2.3"></a>
## [0.2.3](https://github.com/jdiaz5513/capnp-ts/compare/v0.2.2...v0.2.3) (2017-11-21)


### Bug Fixes

* **compiler:** relax compiler settings for capnpc-js ([#84](https://github.com/jdiaz5513/capnp-ts/issues/84)) ([5e89626](https://github.com/jdiaz5513/capnp-ts/commit/5e89626)), closes [#83](https://github.com/jdiaz5513/capnp-ts/issues/83)




<a name="0.2.2"></a>
## [0.2.2](https://github.com/jdiaz5513/capnp-ts/compare/v0.2.1...v0.2.2) (2017-11-20)


### Bug Fixes

* **build:** update lerna configuration ([51024e5](https://github.com/jdiaz5513/capnp-ts/commit/51024e5))
* **compiler:** do not generate imports for external files ([#82](https://github.com/jdiaz5513/capnp-ts/issues/82)) ([b1dd5b3](https://github.com/jdiaz5513/capnp-ts/commit/b1dd5b3))




# 0.2.1

Structs can be imported from other schema files.

```capnp
@0xfc552bdafbb0b889;

using Bar = import "import-bar.capnp";

struct Foo {
baz @0 :Bar.Baz;
}
```

# 0.2.0

The message factory functions have been integrated into a revamped message constructor.

```typescript
capnp.Message.fromArrayBuffer(buf);       // 0.1.6
new capnp.Message(buf, false);            // >=0.2.0

capnp.Message.fromPackedArrayBuffer(buf); // 0.1.6
new capnp.Message(buf);                   // >=0.2.0

capnp.Message.fromBuffer(buf);            // 0.1.6
new capnp.Message(buf, false);            // >=0.2.0

capnp.Message.fromPackedBuffer(buf);      // 0.1.6
new capnp.Message(buf);                   // >=0.2.0

capnp.Message.fromSegmentBuffer(buf);     // 0.1.6
new capnp.Message(buf, false, true);      // >=0.2.0
```

Many other methods that were intended to be private are also no longer exposed on their classes, and private members have been moved to `_capnp` properties on all Pointer types.

Don't touch anything inside `_capnp`!
