import tap from "tap";

import { ObjectSize } from "capnp-ts";

void tap.test("ObjectSize.toString()", (t) => {
  t.equal(new ObjectSize(8, 1).toString(), "ObjectSize_dw:1,pc:1");

  t.end();
});
