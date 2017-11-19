@0xfc552bdafbb0b889;

using Bar = import "import-bar.capnp";

struct Foo {
  baz @0 :Bar.Baz;
}
