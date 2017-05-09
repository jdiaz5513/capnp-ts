# Milestone: Initial public release

* [X] ~~*Make sure basic docstrings are in place for all modules.*~~
* [X] ~~*Get address book write test working.*~~
* [ ] Get address book read test working.
* [ ] Implement entire Struct and List API.
* [ ] Consider monorepo structure (`capnp-ts`, `capnpc-ts`, `capnp-ts-websocket-demo`, `capnp-ts-xhr-demo`).
* [ ] Implement/test schema compiler.
* [ ] Flesh out readme.
* [ ] Add JSDocs for the entire public API.
* [ ] Check for unused methods (find references on each exported symbol/method).
* [ ] Check for unused error strings.
* [ ] Unit test all the things.
* [ ] Carefully export only useful classes in `src/index.ts`.
* [ ] Tighen down class member/method access.

# Milestone: RPC

* [ ] Fill in implementation for everything in the rpc module.
* [ ] Unit test all the things.
* [ ] Try to make everything play nice with bluebird, ideally extending it.
* [ ] Implement a reference WebSocket RPC transport.
* [ ] Implement a reference node server & client to test WebSocket transport.
* [ ] Implement a reference XMLHttpRequest RPC transport.
* [ ] Implement a reference node server & browser client to test XMLHttpRequest RPC transport.

# Milestone: Safety

* [ ] Set up comprehensive documentation ([Gitbook?](https://www.gitbook.com/)).
* [ ] Add fuzzer tests with [testcheck] (https://www.npmjs.com/package/testcheck).
* [ ] Add integration tests that hit every failure condition (like maxing out on 32-bit integer values).
* [ ] Audit for potential overflow situations.

# Milestone: Performance

* [ ] Use const enums.
* [ ] Get rid of all known slow things (`instanceof`, `for in`, `eval`, `try`, `catch`).
* [ ] Test memoization of pointer read operations.
* [ ] Gather CPU/RAM profiles on large messages.
* [ ] Benchmark against C++ reference implementation.
* [ ] Add a fast path for copying text/data lists.
* [ ] Trace for deoptimizations in V8.
