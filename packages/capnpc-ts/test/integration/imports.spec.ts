import tap from "tap";
import * as capnp from "capnp-ts";
import { Foo } from "./import-foo.capnp.js";

void tap.test("schema imports", (t) => {
  t.doesNotThrow(() => {
    new capnp.Message().initRoot(Foo).initBaz();
  });

  t.end();
});
