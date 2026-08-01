@0xc78a29e6b2c1f3d4;

using Bar = import "import-bar.capnp";

const answer :UInt16 = 42;
const blob :Data = 0x"01 02 03";
const greeting :Text = "hey";
const numbers :List(Int32) = [1, 2, 3];
const pi :Float64 = 3.14159;
const someBaz :Bar.Baz = (bar = "hi");
