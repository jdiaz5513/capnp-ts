import * as tap from "tap";

import { ObjectSize } from "../../../lib";

tap.test("ObjectSize.toString()", (t) => {
  t.equal(new ObjectSize(8, 1).toString(), "ObjectSize_dw:1,pc:1");

  t.end();
});
