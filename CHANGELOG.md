# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

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
