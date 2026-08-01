@0xa5dc1856b8f6d330;

# Generic fixture: a parameterized struct + interface, plus a concrete
# interface whose results brand them — exercises parameter-typed
# accessors, brand resolution, and bound client construction.

struct Thing {
    weight @0 :Float64;
    name @1 :Text;
}

struct Box(T) {
    item @0 :T;
    label @1 :Text;
}

interface Holder(T) {
    get @0 () -> (value :T);
    put @1 (value :T) -> ();
}

interface Depot {
    thingHolder @0 () -> (holder :Holder(Thing));
}
