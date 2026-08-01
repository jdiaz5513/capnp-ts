import tap from "tap";
import { WebSocketServer } from "ws";

import { Conn } from "capnp-ts";
import { Calculator } from "./calculator.capnp.js";

void tap.test("RPC Level 1: Calculator.add over WebSocket", async (t) => {
  t.setTimeout(5000);

  const wss = new WebSocketServer({ port: 0 });
  const port = (wss.address() as { port: number }).port;

  wss.on("connection", (ws) => {
    new Conn(ws, {
      main: new Calculator.Server({
        add: ({a, b}, result) => {
          result.sum = a + b;
        },
        getOperator: () => {
          throw new Error("not exercised in this spec");
        },
      }),
    });
  });

  t.teardown(() => wss.close());

  // No await-open dance: the transport buffers sends until the socket opens.
  const ws = new WebSocket(`ws://localhost:${port}`);
  t.teardown(() => ws.close());

  const conn = new Conn(ws);
  const calc = conn.bootstrap(Calculator);
  const result = await calc.add({ a: 2, b: 3 });

  t.equal(result.sum, 5, "add(2, 3) = 5");

  t.end();
});
