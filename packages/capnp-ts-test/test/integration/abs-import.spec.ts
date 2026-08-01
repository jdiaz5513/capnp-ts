import tap from "tap";
import * as capnp from "capnp-ts";
import { AbsBox } from "./abs-import.capnp.js";

void tap.test("absolute schema imports", (t) => {
  const box = new capnp.Message().initRoot(AbsBox);
  box.initCorner().setX(1.5);

  t.equal(box.getCorner().getX(), 1.5);

  t.end();
});
