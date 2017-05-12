# Milestone: 0.1.0 (initial public release)

* [X] ~~*Make sure basic docstrings are in place for all modules.*~~
* [X] ~~*Get address book write test working.*~~
* [X] ~~*Get address book read test working.*~~
* [X] ~~*Add basic performance benchmark.*~~
* [X] ~~*Add CI (travis?).*~~
* [ ] Hit 100% coverage.
* [ ] Implement entire Struct and List API.
* [ ] Consider monorepo structure (`capnp-ts`, `capnpc-ts`, `capnp-ts-websocket-demo`, `capnp-ts-xhr-demo`).
* [ ] Implement/test schema compiler.
* [ ] Flesh out readme.

# Milestone: 0.2.0 (code quality)

* [ ] Add JSDocs for the entire public API.
* [ ] Check for unused methods (find references on each exported symbol/method).
* [ ] Check for unused error strings.
* [ ] Unit test all the things.
* [ ] Carefully export only useful classes in `src/index.ts`.
* [ ] Tighen down class member/method access.
* [ ] Consider a separate ES6 build (with proxied array accessors).

# Milestone: 0.3.0 (rpc)

* [ ] Fill in implementation for everything in the rpc module.
* [ ] Unit test all the things.
* [ ] Try to make everything play nice with bluebird, ideally extending it.
* [ ] Implement a reference WebSocket RPC transport.
* [ ] Implement a reference node server & client to test WebSocket transport.
* [ ] Implement a reference XMLHttpRequest RPC transport.
* [ ] Implement a reference node server & browser client to test XMLHttpRequest RPC transport.

# Milestone: 0.4.0 (safety)

* [ ] Set up comprehensive documentation ([Gitbook?](https://www.gitbook.com/)).
* [ ] Add fuzzer tests with [testcheck] (https://www.npmjs.com/package/testcheck).
* [ ] Add integration tests that hit every failure condition (like maxing out on 32-bit integer values).
* [ ] Audit for potential overflow situations.

# Milestone: 0.5.0 (performance)

* [ ] Use const enums.
* [ ] Get rid of all known slow things (`instanceof`, `for in`, `eval`, `try`, `catch`).
* [ ] Consider fast optimizations to avoid division (`>>> 3` vs `/ 8`).
* [ ] Test memoization of pointer read operations.
* [ ] Gather CPU/RAM profiles on large messages.
* [ ] Benchmark against C++ reference implementation.
* [ ] Add a fast path for copying text/data lists.
* [ ] Trace for deoptimizations in V8.
