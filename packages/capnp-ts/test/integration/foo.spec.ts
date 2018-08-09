import { tap } from "../util";
import * as capnp from "../../lib";

import { Foo as OldFoo } from "./foo.capnp";
import { Foo as NewFoo } from "./foo-new.capnp";

tap.test("foo regression", t => {
  const oldMessage = new capnp.Message();
  const oldFoo = oldMessage.initRoot(OldFoo);

  oldFoo.setBar("bar");

  const packed = Buffer.from(oldMessage.toPackedArrayBuffer());

  const newMessage = new capnp.Message(packed);
  const newFoo = newMessage.getRoot(NewFoo);

  t.pass("should not 💩 the 🛏");

  t.end();
});
