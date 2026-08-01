import tap from "tap";

import { Conn } from "capnp-ts";

import { SimpleInterface } from "./simple-interface.capnp.js";
import { TestTransport } from "./test-transport.js";

void tap.test("RPC Level 1: simple interface demo", async (t) => {
  t.setTimeout(5000);

  const [clientT, serverT] = TestTransport.pair();

  new Conn(serverT, {
    main: new SimpleInterface.Server({
      subtract: (p, r) => {
        r.setResult(p.getA() - p.getB());
      },
    }),
  });

  const si = new Conn(clientT).bootstrap(SimpleInterface);
  const res = await si.subtract((p) => p.set({ a: 9, b: -1 }));

  t.equal(res.getResult(), 10, "subtract(9, -1) = 10");

  t.end();
});
