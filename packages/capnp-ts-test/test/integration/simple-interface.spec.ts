import tap from "tap";
import { SimpleInterface } from "./simple-interface.capnp.js";
import { TestNetwork } from "../../../capnp-ts/src/rpc/transport/test-network.js";

void tap.test("simple interface demo", async (t) => {
  t.plan(1);
  t.setTimeout(1000);
  t.teardown(() => TestNetwork.shutdown());
  TestNetwork.onError = t.error.bind(t);

  const server = async () => {
    const s = await TestNetwork.accept();
    s.initMain(SimpleInterface, {
      subtract: (p, r) => Promise.resolve(r.setResult(p.getA() - p.getB())),
    });
    return s;
  };

  const client = async () => {
    const res = await TestNetwork.connect()
      .bootstrap(SimpleInterface)
      .subtract((p) => {
        p.setA(9);
        p.setB(-1);
      })
      .promise();
    return res.getResult();
  };

  try {
    const [, result] = await Promise.all([server(), client()]);
    t.equal(result, 10);
  } catch (err) {
    t.error(err);
  } finally {
    t.end();
  }
});
