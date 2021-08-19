import tap from "tap";
import * as capnp from "capnp-ts";
import { Baz } from "./import-bar.capnp.js";
import { Foo } from "./import-foo.capnp.js";

void tap.test("schema imports", (t) => {
  t.doesNotThrow(() => {
    new capnp.Message().initRoot(Baz).setBar("bar");
    new capnp.Message().initRoot(Foo).initBaz().setBar("bar");
  });

  t.end();
});
