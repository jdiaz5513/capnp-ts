import tap from "tap";

import { Conn } from "capnp-ts";

import { Counter, NamedCounter, NamedCounter2, TimedCounter } from "./inheritance.capnp.js";
import { TestTransport } from "./test-transport.js";

void tap.test("RPC inheritance: flattened client carries every ancestor method", (t) => {
  const rows = NamedCounter2.Client.methods.map((m) => `${m.interfaceName.split(":")[1]}.${m.methodName}`);
  t.strictSame(rows, ["NamedCounter.reset", "Counter.count", "Counter.add", "Named.name"]);
  const inherited = NamedCounter.Client.methods.find((m) => m.methodName === "count");
  t.equal(inherited?.interfaceId, Counter.Client.interfaceId, "inherited rows keep the declaring interface id");
  t.equal(inherited?.methodId, 0, "inherited rows keep the declaring method id");
  t.end();
});

void tap.test("RPC inheritance: inherited methods dispatch across the wire", async (t) => {
  t.setTimeout(5000);

  const [clientT, serverT] = TestTransport.pair();

  let n = 0;
  new Conn(serverT, {
    main: new NamedCounter2.Server({
      add: (p) => {
        n += p.getN();
      },
      count: (_p, r) => {
        r.setN(n);
      },
      name: (_p, r) => {
        r.setName("bender");
      },
      reset: () => {
        n = 0;
      },
    }),
  });

  const conn = new Conn(clientT);
  const counter = conn.bootstrap(NamedCounter2);
  await counter.add({ n: 40 });
  await counter.add({ n: 2 });
  t.equal((await counter.count()).getN(), 42, "transitively inherited methods dispatch");
  t.equal((await counter.name()).getName(), "bender", "second parent's methods dispatch");
  await counter.reset();
  t.equal((await counter.count()).getN(), 0, "direct parent's methods dispatch");

  t.end();
});

void tap.test("RPC inheritance: superclasses from another file dispatch", async (t) => {
  t.setTimeout(5000);

  const [clientT, serverT] = TestTransport.pair();

  new Conn(serverT, {
    main: new TimedCounter.Server({
      add: () => undefined,
      count: (_p, r) => {
        r.setN(7);
      },
      now: (_p, r) => {
        r.setStamp("2026-08-20T00:00:00.000-07:00");
      },
    }),
  });

  const conn = new Conn(clientT);
  const timed = conn.bootstrap(TimedCounter);
  t.equal((await timed.count()).getN(), 7, "same-file parent dispatches");
  t.equal((await timed.now()).getStamp(), "2026-08-20T00:00:00.000-07:00", "imported parent dispatches");

  t.end();
});
