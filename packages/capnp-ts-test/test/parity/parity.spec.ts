import * as capnp from "capnp-ts";
import { spawnSync } from "child_process";
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "fs";
import * as os from "os";
import * as path from "path";
import tap from "tap";

import { TestAllTypes, TestEnum } from "./parity-test.capnp.js";

const SCHEMA = path.join(__dirname, "parity-test.capnp");

function capnpEncode(text: string, rootType: string, packed = false): ArrayBuffer {
  const args = ["encode"];
  if (packed) args.push("--packed");
  args.push(SCHEMA, rootType);
  const res = spawnSync("capnp", args, { input: text });
  if (res.status !== 0) {
    throw new Error(`capnp encode failed: ${res.stderr.toString()}`);
  }
  return res.stdout.buffer.slice(res.stdout.byteOffset, res.stdout.byteOffset + res.stdout.byteLength);
}

function capnpDecode(buf: ArrayBuffer, rootType: string, packed = false): string {
  const args = ["decode"];
  if (packed) args.push("--packed");
  args.push(SCHEMA, rootType);
  const res = spawnSync("capnp", args, { input: Buffer.from(buf) });
  if (res.status !== 0) {
    throw new Error(`capnp decode failed: ${res.stderr.toString()}`);
  }
  return res.stdout.toString();
}

// Skip the whole suite if capnp is not on PATH (e.g. running outside the nix devShell).
const HAS_CAPNP = spawnSync("capnp", ["--version"]).status === 0;

tap.test("parity", { skip: !HAS_CAPNP ? "capnp binary not on PATH" : undefined }, (t) => {
  void t.test("read: TestAllTypes with int32Field=42, textField=hello, enumField=baz", (t) => {
    const ref = capnpEncode(`(int32Field = 42, textField = "hello", enumField = baz)`, "TestAllTypes");
    const m = new capnp.Message(ref, false);
    const r = m.getRoot(TestAllTypes);

    t.equal(r.getInt32Field(), 42);
    t.equal(r.getTextField(), "hello");
    t.equal(r.getEnumField(), TestEnum.BAZ);

    t.end();
  });

  void t.test("write: TestAllTypes round-trip via capnp-ts produces identical unpacked bytes", (t) => {
    const ref = capnpEncode(`(int32Field = 42, textField = "hello", enumField = baz)`, "TestAllTypes");

    const m = new capnp.Message();
    const r = m.initRoot(TestAllTypes);
    r.setInt32Field(42);
    r.setTextField("hello");
    r.setEnumField(TestEnum.BAZ);

    const out = m.toArrayBuffer();

    // compareBuffers would be ideal here but it's in the test/util module;
    // a direct byte comparison is fine for parity.
    t.equal(out.byteLength, ref.byteLength, "byte lengths should match");
    if (out.byteLength === ref.byteLength) {
      const a = new Uint8Array(out);
      const b = new Uint8Array(ref);
      let mismatch = -1;
      for (let i = 0; i < a.byteLength; i++) {
        if (a[i] !== b[i]) { mismatch = i; break; }
      }
      t.equal(mismatch, -1, `bytes should match (first mismatch at ${mismatch})`);
    }

    t.end();
  });

  void t.test("packed round-trip: ts writes packed, C++ unpacks, values match", (t) => {
    const m = new capnp.Message();
    const r = m.initRoot(TestAllTypes);
    r.setInt32Field(42);
    r.setTextField("hello");
    r.setEnumField(TestEnum.BAZ);

    const packed = m.toPackedArrayBuffer();
    const text = capnpDecode(packed, "TestAllTypes", true);

    t.match(text, /int32Field = 42/);
    t.match(text, /textField = "hello"/);
    t.match(text, /enumField = baz/);

    t.end();
  });

  void t.test("packed round-trip: C++ writes packed, ts unpacks, values match", (t) => {
    const packed = capnpEncode(`(int32Field = 42, textField = "hello", enumField = baz)`, "TestAllTypes", true);
    const m = new capnp.Message(packed); // default packed=true
    const r = m.getRoot(TestAllTypes);

    t.equal(r.getInt32Field(), 42);
    t.equal(r.getTextField(), "hello");
    t.equal(r.getEnumField(), TestEnum.BAZ);

    t.end();
  });

  t.end();
});
