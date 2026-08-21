@0x9970ac0a79740f50;

# Interface inheritance fixture: single, multiple, transitive, and empty
# subclasses — clients and servers must carry every inherited method with
# the declaring interface's id so wire dispatch stays correct.

interface Counter {
    count @0 () -> (n :UInt32);
    add @1 (n :UInt32) -> ();
}

interface Named {
    name @0 () -> (name :Text);
}

interface NamedCounter extends(Counter, Named) {
    reset @0 () -> ();
}

interface NamedCounter2 extends(NamedCounter) {
}

using Lib = import "inheritance-lib.capnp";

interface TimedCounter extends(Counter, Lib.Clock) {
}
