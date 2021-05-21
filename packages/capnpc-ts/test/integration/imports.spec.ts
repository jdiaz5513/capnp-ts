import * as tap from "tap";
import * as capnp from "capnp-ts";
import { Foo } from "./import-foo.capnp";

tap.test("schema imports", (t) => {
  t.doesNotThrow(() => {
    new capnp.Message().initRoot(Foo).initBaz();
  });

  t.end();
});
