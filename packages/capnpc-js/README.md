# capnpc-js

A [Cap'n Proto](https://capnproto.org/) schema compiler for JavaScript.

Basic usage (assuming [capnp](https://capnproto.org/capnp-tool.html) is already installed):

```shell
npm install -g capnpc-js
capnpc -o js path/to/myschema.capnp
```

This will generate a file at `path/to/myschema.capnp.js`.

This compiler just proxies the CodeGeneratorRequest out to the [capnpc-ts](https://www.npmjs.com/package/capnpc-ts) package to generate TypeScript source, then runs the TypeScript compiler to get the final output JavaScript.

Visit [https://github.com/jdiaz5513/capnp-ts](https://github.com/jdiaz5513/capnp-ts) for an extended README.
