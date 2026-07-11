import { createHash } from "crypto";
import tap from "tap";

import { Conn } from "capnp-ts";
import { bufferToHex, encodeUtf8 } from "capnp-ts/src/util.js";

import { Hash, HashFactory } from "./hash-factory.capnp.js";
import { TestTransport } from "./test-transport.js";

void tap.test("RPC Level 1: hash factory demo", async (t) => {
  t.setTimeout(5000);

  const [clientT, serverT] = TestTransport.pair();

  new Conn(serverT, {
    main: new HashFactory.Server({
      newSha1: (_p, r) => {
        const hash = createHash("sha1");

        r.setHash(
          new Hash.Server({
            sum: (_p2, r2) => {
              const digest = hash.digest();

              r2.initHash(digest.byteLength).copyBuffer(digest);
            },
            write: (p2) => {
              hash.update(p2.getData().toUint8Array());
            },
          }),
        );
      },
    }),
  });

  const conn = new Conn(clientT);
  // Every call below is pipelined: newSha1's Return has not arrived when the writes
  // and sum are sent, and delivery order must hold for the digest to be right.
  const hash = conn.bootstrap(HashFactory).newSha1().getHash();

  void hash.write({ data: encodeUtf8("hello ") });
  void hash.write({ data: encodeUtf8("world") });

  const sum = await hash.sum();

  t.equal(
    bufferToHex(sum.getHash().toArrayBuffer()),
    "[2a ae 6c 35 c9 4f cf b4 15 db e9 5f 40 8b 9c e9 1e e8 46 ed]",
    "sha1 digest of pipelined writes",
  );

  t.end();
});
