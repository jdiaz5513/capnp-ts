import * as capnp from "capnp-ts";
import tap from "tap";
import { BigIntBag } from "./bigintbag.capnp.js";

void tap.test("64 bit with bigint support", (t) => {
  const message = new capnp.Message();
  const b = message.initRoot(BigIntBag);
  const unsigned = BigInt("999999");
  const signed = BigInt("-999999");

  t.equal(b.getSigned(), BigInt(0));
  t.equal(b.getUnsigned(), BigInt(0));
  t.equal(b.getDefaultSigned(), BigInt("-987654321987654321"));
  t.equal(b.getDefaultUnsigned(), BigInt("987654321987654321"));

  b.setSigned(signed);
  b.setUnsigned(unsigned);
  b.setDefaultSigned(signed);
  b.setDefaultUnsigned(unsigned);

  t.equal(b.getUnsigned(), unsigned);
  t.equal(b.getSigned(), signed);
  t.equal(b.getDefaultSigned(), signed);
  t.equal(b.getDefaultUnsigned(), unsigned);
  t.end();
});
