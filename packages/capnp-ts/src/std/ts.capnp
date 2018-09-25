# Annotations for controlling the capnpc-ts schema compiler.
#
# author: jdiaz5513

@0xe37ded525a68a7c9;

# Override the import path for the capnp-ts library. Outside of the library
# itself this is not likely to be super useful. Defaults to "capnp-ts" when the
# annotation is not used.

annotation importPath(file): Text;

$importPath("../index");
