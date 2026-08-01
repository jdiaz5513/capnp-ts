@0xb4c2e19d8fe23a71;

# Absolute imports resolve against the compiler's -I search paths (see the capnp compile rule in the Makefile).

using Lib = import "/abs-import-lib.capnp";

struct AbsBox {
  corner @0 :Lib.AbsPoint;
}
