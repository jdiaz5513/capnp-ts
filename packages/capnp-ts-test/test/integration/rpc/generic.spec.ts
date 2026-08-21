import tap from "tap";

import * as capnp from "capnp-ts";
import { Conn } from "capnp-ts";

import { Box, Depot, Holder, Holder_Client, Thing, ThingBoxHolder, ThingHolder, ThingSubHolder } from "./generic.capnp.js";
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

void tap.test("RPC generics: inherited branded methods arrive typed", async (t) => {
  t.setTimeout(5000);

  const [clientT, serverT] = TestTransport.pair();

  const things: { name: string; weight: number }[] = [];
  new Conn(serverT, {
    main: new ThingHolder.Server({
      get: (_gp, gr) => {
        const v = gr.initValue();
        v.setName(things[things.length - 1]?.name ?? "");
        v.setWeight(things[things.length - 1]?.weight ?? 0);
      },
      put: (pp, _pr) => {
        const v = pp.getValue();
        things.push({ name: v.getName(), weight: v.getWeight() });
      },
      size: (_sp, sr) => {
        sr.setCount(things.length);
      },
    }),
  });

  const conn = new Conn(clientT);
  const holder = conn.bootstrap(ThingHolder);
  await holder.put((p) => {
    const v = p.initValue();
    v.setName("anvil");
    v.setWeight(100.5);
  });
  t.equal((await holder.size()).getCount(), 1, "own method dispatches");
  const got = await holder.get();
  t.equal(got.getValue().getName(), "anvil", "inherited branded method is typed without explicit ctors");
  t.equal(got.getValue().getWeight(), 100.5);

  t.end();
});

void tap.test("RPC generics: brands compose through re-parameterized parents", async (t) => {
  t.setTimeout(5000);

  const [clientT, serverT] = TestTransport.pair();

  let label = "unlabeled";
  let thing = { name: "", weight: 0 };
  new Conn(serverT, {
    main: new ThingSubHolder.Server({
      get: (_gp, gr) => {
        const v = gr.initValue();
        v.setName(thing.name);
        v.setWeight(thing.weight);
      },
      put: (pp, _pr) => {
        const v = pp.getValue();
        thing = { name: v.getName(), weight: v.getWeight() };
      },
      relabel: (rp, _rr) => {
        label = rp.getLabel();
      },
    }),
  });

  const conn = new Conn(clientT);
  const holder = conn.bootstrap(ThingSubHolder);
  await holder.relabel({ label: "cargo" });
  t.equal(label, "cargo", "intermediate parent's method dispatches");
  await holder.put((p) => {
    const v = p.initValue();
    v.setName("crate");
    v.setWeight(9.5);
  });
  const got = await holder.get();
  t.equal(got.getValue().getName(), "crate", "grandparent method arrives typed through the composed brand");
  t.equal(got.getValue().getWeight(), 9.5);

  t.end();
});

void tap.test("RPC generics: brands compose through nested struct brands", async (t) => {
  t.setTimeout(5000);

  const [clientT, serverT] = TestTransport.pair();

  let boxed = { label: "", name: "" };
  new Conn(serverT, {
    main: new ThingBoxHolder.Server({
      get: (_gp, gr) => {
        const box = gr.initValue();
        box.setLabel(boxed.label);
        box.initItem().setName(boxed.name);
      },
      put: (pp, _pr) => {
        const box = pp.getValue();
        boxed = { label: box.getLabel(), name: box.getItem().getName() };
      },
    }),
  });

  const conn = new Conn(clientT);
  const holder = conn.bootstrap(ThingBoxHolder);
  await holder.put((p) => {
    const box = p.initValue();
    box.setLabel("hazmat");
    box.initItem().setName("flux");
  });
  const got = await holder.get();
  t.equal(got.getValue().getLabel(), "hazmat", "nested brand arrives typed");
  t.equal(got.getValue().getItem().getName(), "flux", "inner generic field is typed through Box<Thing>");

  t.end();
});
