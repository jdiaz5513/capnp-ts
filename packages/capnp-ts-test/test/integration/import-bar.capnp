@0x9cbc682922e84ff9;

using Foo = import "import-foo.capnp";

const foo :Foo.Foo = ();

struct Baz {
  const fooConst :Foo.Foo = ();
  bar @0 :Text;
}
