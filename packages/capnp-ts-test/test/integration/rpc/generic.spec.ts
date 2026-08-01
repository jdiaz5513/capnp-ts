import tap from "tap";

import * as capnp from "capnp-ts";
import { Conn } from "capnp-ts";

import { Box, Depot, Holder, Holder_Client, Thing } from "./generic.capnp.js";
import { TestTransport } from "./test-transport.js";

void tap.test("generics: bound struct accessors round-trip", (t) => {
  const BoundBox = capnp.bindGeneric(Box<Thing>, [Thing]);
  const msg = new capnp.Message();
  const box = msg.initRoot(BoundBox);
  box.setLabel("cargo");
  const item = box.initItem();
  item.setWeight(12.5);
  item.setName("gear");

  const words = msg.toArrayBuffer();
  const read = new capnp.Message(words, false).getRoot(BoundBox);
  t.equal(read.getLabel(), "cargo");
  t.equal(read.getItem().getWeight(), 12.5, "typed read through the binding");

  // Unbound reads work with an explicit ctor and throw without one.
  const unbound = new capnp.Message(words, false).getRoot(Box);
  t.equal(unbound.getItem(Thing).getName(), "gear", "explicit ctor read");
  t.throws(() => unbound.getItem(), /unbound/, "ctor-less unbound read throws");

  t.end();
});

void tap.test("RPC generics: branded holder is typed end-to-end", async (t) => {
  t.setTimeout(5000);

  const [clientT, serverT] = TestTransport.pair();

  let stored = { name: "", weight: 0 };
  new Conn(serverT, {
    main: new Depot.Server({
      thingHolder: (_p, r) => {
        // Server bindings: dispatch constructs params/results through
        // the bound ctors, so impls read fully typed with no explicit
        // ctor arguments.
        r.setHolder(
          new Holder.Server(
            {
              get: (_gp, gr) => {
                const v = gr.initValue();
                v.setWeight(stored.weight);
                v.setName(stored.name);
              },
              put: (pp, _pr) => {
                const v = pp.getValue();
                stored = { name: v.getName(), weight: v.getWeight() };
              },
            },
            [Thing],
          ),
        );
      },
    }),
  });

  const conn = new Conn(clientT);
  const depot = conn.bootstrap(Depot);
  // Pipelined typed client: Holder_Client<Thing> straight off the
  // promise, bindings attached by the generated accessor.
  const holder: Holder_Client<Thing> = depot.thingHolder().getHolder();

  await holder.put((p) => {
    const v = p.initValue();
    v.setWeight(3.25);
    v.setName("payload");
  });
  const got = await holder.get();
  const value: Thing = got.getValue();
  t.equal(value.getWeight(), 3.25, "typed generic result");
  t.equal(value.getName(), "payload");

  t.end();
});

void tap.test("RPC generics: unbound server dispatches via explicit ctors", async (t) => {
  t.setTimeout(5000);

  const [clientT, serverT] = TestTransport.pair();
  let seen = 0;
  new Conn(serverT, {
    main: new Depot.Server({
      thingHolder: (_p, r) => {
        r.setHolder(
          new Holder.Server({
            get: (_gp, gr) => {
              gr.initValue(Thing).setWeight(seen);
            },
            put: (pp, _pr) => {
              seen = pp.getValue(Thing).getWeight();
            },
          }),
        );
      },
    }),
  });

  const conn = new Conn(clientT);
  const holder = conn.bootstrap(Depot).thingHolder().getHolder();
  await holder.put((p) => p.initValue().setWeight(7.75));
  const got = await holder.get();
  t.equal(got.getValue().getWeight(), 7.75, "unbound server round-trips");

  t.end();
});
