import tap from "tap";
import { answer, getBlob, getNumbers, getSomeBaz, greeting, pi } from "./constants.capnp.js";

void tap.test("file-scoped constants", (t) => {
  t.equal(answer, 42);
  t.equal(greeting, "hey");
  t.equal(pi, 3.14159);

  t.strictSame(Array.from(getBlob().toUint8Array()), [1, 2, 3]);

  const numberList = getNumbers();
  t.equal(numberList.getLength(), 3);
  t.equal(numberList.get(1), 2);

  t.equal(getSomeBaz().getBar(), "hi");

  t.end();
});
