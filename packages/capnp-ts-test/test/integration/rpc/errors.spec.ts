import tap from "tap";

import * as capnp from "capnp-ts";
import { Conn } from "capnp-ts";
import { Message as RPCMessage } from "capnp-ts/src/std/rpc.capnp.js";

import { Calculator } from "./calculator.capnp.js";
import { TestTransport } from "./test-transport.js";

void tap.test("RPC Level 1: exceptions propagate to the caller", async (t) => {
  t.setTimeout(5000);

  const [clientT, serverT] = TestTransport.pair();

  new Conn(serverT, {
    main: new Calculator.Server({
      add: () => {
        throw new Error("boom: intentional failure");
      },
      getOperator: async () => {
        // Async rejections propagate the same way as sync throws.
        return Promise.reject(new Error("async boom"));
      },
    }),
  });

  const conn = new Conn(clientT);
  const calc = conn.bootstrap(Calculator);

  await t.rejects(
    Promise.resolve(
      calc.add((p) => {
        p.setA(1);
        p.setB(1);
      }),
    ),
    /boom: intentional failure/,
    "sync throw in server method rejects the client promise with the message",
  );

  await t.rejects(
    Promise.resolve(calc.getOperator((p) => p.setOp(Calculator.Operator.ADD))),
    /async boom/,
    "async rejection in server method rejects the client promise",
  );

  // The connection survives failed calls.
  t.doesNotThrow(() => conn.close(), "connection still closeable after errors");

  t.end();
});

void tap.test("RPC Level 1: abort tears down the connection", async (t) => {
  t.setTimeout(5000);

  const [clientT, serverT] = TestTransport.pair();

  let abortError: Error | undefined;

  const conn = new Conn(clientT, {
    onError: (err) => {
      abortError = err;
    },
  });

  const calc = conn.bootstrap(Calculator);

  // Server sends an Abort instead of responding to the bootstrap.
  const m = new capnp.Message();

  m.initRoot(RPCMessage).initAbort().setReason("server going down");
  serverT.send(new Uint8Array(m.toArrayBuffer()));

  await t.rejects(
    Promise.resolve(calc.add({ a: 1, b: 2 })),
    /server going down/,
    "pending calls reject with the abort reason",
  );

  t.ok(abortError, "onError fired");
  t.match(abortError?.message, /server going down/, "onError received the abort reason");

  // The transport was closed by the abort handler.
  t.throws(
    () => clientT.send(new Uint8Array(0)),
    /send after close/,
    "client transport closed after abort",
  );

  // Subsequent aborts/closes are no-ops.
  t.doesNotThrow(() => conn.close(), "double close after abort is safe");

  t.end();
});

void tap.test("RPC Level 1: transport close triggers onError", async (t) => {
  t.setTimeout(5000);

  const [clientT, serverT] = TestTransport.pair();

  let closeError: Error | undefined;

  const conn = new Conn(clientT, {
    onError: (err) => {
      closeError = err;
    },
  });

  const calc = conn.bootstrap(Calculator);

  // Server closes its end.
  serverT.close();

  await t.rejects(
    Promise.resolve(calc.add({ a: 1, b: 2 })),
    /connection closed/,
    "pending calls reject when the transport closes",
  );

  t.ok(closeError, "onError fired on transport close");

  t.end();
});
