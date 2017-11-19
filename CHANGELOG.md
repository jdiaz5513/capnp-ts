# 0.2.1

Structs can be imported from other schema files.

```capnp
@0xfc552bdafbb0b889;

using Bar = import "import-bar.capnp";

struct Foo {
  baz @0 :Bar.Baz;
}
```

# 0.2.0

The message factory functions have been integrated into a revamped message constructor.

```typescript
capnp.Message.fromArrayBuffer(buf);       // 0.1.6
new capnp.Message(buf, false);            // >=0.2.0

capnp.Message.fromPackedArrayBuffer(buf); // 0.1.6
new capnp.Message(buf);                   // >=0.2.0

capnp.Message.fromBuffer(buf);            // 0.1.6
new capnp.Message(buf, false);            // >=0.2.0

capnp.Message.fromPackedBuffer(buf);      // 0.1.6
new capnp.Message(buf);                   // >=0.2.0

capnp.Message.fromSegmentBuffer(buf);     // 0.1.6
new capnp.Message(buf, false, true);      // >=0.2.0
```

Many other methods that were intended to be private are also no longer exposed on their classes, and private members have been moved to `_capnp` properties on all Pointer types.

Don't touch anything inside `_capnp`!
