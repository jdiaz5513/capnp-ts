@0xfc552bdafbb0b889;

using Cxx = import "/capnp/c++.capnp";
using Bar = import "import-bar.capnp";

$Cxx.namespace("Initrode");

struct Foo {
  baz @0 :Bar.Baz;
}
