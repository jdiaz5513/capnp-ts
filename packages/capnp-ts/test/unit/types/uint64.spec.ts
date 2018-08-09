import { gen, property } from "testcheck";

import { Uint64 } from "../../../lib/types/uint64";
import { runTestCheck, tap } from "../../util";

tap.test("Uint64.fromNumber().toNumber()", t => {
  runTestCheck(
    t,
    property(
      gen.intWithin(0, Number.MAX_SAFE_INTEGER),
      x => Uint64.fromNumber(x).toNumber() === x
    ),
    { numTests: 1000 }
  );

  t.end();
});
