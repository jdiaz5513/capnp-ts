import tap from "tap";
import * as capnp from "capnp-ts";
import { Baz, getFoo } from "./import-bar.capnp.js";
import { Foo, getBaz } from "./import-foo.capnp.js";

void tap.test("schema imports", (t) => {
  t.doesNotThrow(() => {
    new capnp.Message().initRoot(Baz).setBar("bar");
    new capnp.Message().initRoot(Foo).initBaz().setBar("bar");
  });

  t.end();
});

void tap.test("file-scoped constants across circular imports", (t) => {
  // import-foo and import-bar import each other; the constants must not observe partially-initialized modules.

  t.equal(getBaz().getBar(), "");
  t.doesNotThrow(() => getFoo().getBaz());

  t.end();
});
