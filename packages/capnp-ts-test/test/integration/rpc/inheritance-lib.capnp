@0xd3f4a55b8c6e2210;

# Imported by inheritance.capnp to exercise cross-file superclasses.

interface Clock {
    now @0 () -> (stamp :Text);
}
