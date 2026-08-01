import tap from "tap";

import { Conn } from "capnp-ts";
import { Message_Which } from "capnp-ts/src/std/rpc.capnp.js";

import { Calculator } from "./calculator.capnp.js";
import { TestTransport } from "./test-transport.js";

function makeServer(): InstanceType<typeof Calculator.Server> {
  return new Calculator.Server({
    add: (p, r) => {
      r.setSum(p.getA() + p.getB());
    },
    getOperator: (_p, r) => {
      r.setFunc(
        new Calculator.Function.Server({
          call: (cp, cr) => {
            cr.setResult(cp.getA() + cp.getB());
          },
        }),
      );
    },
  });
}

void tap.test("RPC Level 1: capability lifetime", async (t) => {
  t.setTimeout(5000);

  const [clientT, serverT] = TestTransport.pair();
  new Conn(serverT, { main: makeServer() });
  const conn = new Conn(clientT);

  const calc = conn.bootstrap(Calculator);
  const results = await calc.getOperator((p) => p.setOp(Calculator.Operator.ADD));
  const func = results.getFunc();

  const r1 = await func.call((p) => {
    p.setA(1);
    p.setB(2);
  });
  t.equal(r1.getResult(), 3, "imported capability callable");

  func.dispose();
  await new Promise((resolve) => setTimeout(resolve, 10));
  t.ok(clientT.sentTypes().includes(Message_Which.RELEASE), "dispose sends a Release message");

  t.doesNotThrow(() => func.dispose(), "double dispose is a no-op");

  await t.rejects(
    Promise.resolve(
      func.call((p) => {
        p.setA(1);
        p.setB(1);
      }),
    ),
    "calls after dispose reject",
  );

  t.end();
});
