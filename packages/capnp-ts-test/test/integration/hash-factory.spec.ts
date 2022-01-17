import { Hash, HashFactory } from "./hash-factory.capnp.js";
import { createHash } from "crypto";
import tap from "tap";
import { TestNetwork } from "capnp-ts/src/rpc/transport";
import { bufferToHex, encodeUtf8 } from "../../../capnp-ts/src/util.js";

void tap.test("HashFactory demo", async (t) => {
  t.plan(1);
  t.setTimeout(1000);
  t.teardown(() => TestNetwork.shutdown());
  TestNetwork.onError = (e) => t.error(e);

  const server = async () => {
    const s = await TestNetwork.accept();
    s.initMain(HashFactory, {
      newSha1: (_, r) => {
        const hash = createHash("sha1");
        const hs = new Hash.Server({
          async sum(_, r) {
            const digest = hash.digest();
            return Promise.resolve(r.initHash(digest.length).copyBuffer(digest));
          },

          write: (p) =>
            new Promise((resolve, reject) =>
              hash.write(p.getData().toUint8Array(), undefined, (err) => (err ? reject(err) : resolve()))
            ),
        });
        return Promise.resolve(r.setHash(hs.client()));
      },
    });
    return s;
  };

  const client = async () => {
    const hash = TestNetwork.connect().bootstrap(HashFactory).newSha1().getHash();
    hash.write((p) => {
      const buf = encodeUtf8("hello ");
      p.initData(buf.byteLength).copyBuffer(buf);
    });
    hash.write((p) => {
      const buf = encodeUtf8("world");
      p.initData(buf.byteLength).copyBuffer(buf);
    });
    const sum = await hash.sum().promise();
    return sum.getHash().toUint8Array();
  };

  const [, result] = await Promise.all([server(), client()]);
  t.equal(bufferToHex(result), "[2a ae 6c 35 c9 4f cf b4 15 db e9 5f 40 8b 9c e9 1e e8 46 ed]");
  t.end();
});
