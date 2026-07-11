import tap from "tap";

import { Conn } from "capnp-ts";
import { Message_Which } from "capnp-ts/src/std/rpc.capnp.js";

import { Calculator } from "./calculator.capnp.js";
import { TestTransport } from "./test-transport.js";

void tap.test("RPC Level 1: promise pipelining", async (t) => {
  t.setTimeout(5000);

  const [clientT, serverT] = TestTransport.pair();

  new Conn(serverT, {
    main: new Calculator.Server({
      add: (p, r) => {
        r.setSum(p.getA() + p.getB());
      },
      getOperator: (p, r) => {
        const op = p.getOp();
        r.setFunc(
          new Calculator.Function.Server({
            call: (cp, cr) => {
              cr.setResult(op === Calculator.Operator.MULTIPLY ? cp.getA() * cp.getB() : cp.getA() + cp.getB());
            },
          }),
        );
      },
    }),
  });

  const conn = new Conn(clientT);
  const calc = conn.bootstrap(Calculator);

  // Both calls below target unresolved promises: getOperator is called on the
  // (unreturned) bootstrap capability, and call is called on getOperator's
  // (unreturned) result field. Neither line awaits.
  const func = calc.getOperator((p) => p.setOp(Calculator.Operator.MULTIPLY)).getFunc();
  const result = await func.call((p) => {
    p.setA(4);
    p.setB(6);
  });

  t.equal(result.getResult(), 24, "pipelined multiply(4, 6) = 24");

  // The pipelining property: bootstrap + getOperator + call all hit the wire before
  // the first Return arrived. (Calls send eagerly; awaiting only subscribes.)
  const firstRecv = clientT.firstRecvIndex();
  const sendsBeforeFirstReturn = clientT.log.slice(0, firstRecv).filter((e) => e.dir === "send").length;
  t.ok(
    sendsBeforeFirstReturn >= 3,
    `bootstrap + getOperator + call sent before first Return (got ${sendsBeforeFirstReturn})`,
  );

  const sent = clientT.sentTypes();
  t.equal(sent[0], Message_Which.BOOTSTRAP, "first message is Bootstrap");
  t.equal(sent.filter((w) => w === Message_Which.CALL).length >= 2, true, "two pipelined Calls sent");

  t.end();
});
