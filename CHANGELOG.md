# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

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
