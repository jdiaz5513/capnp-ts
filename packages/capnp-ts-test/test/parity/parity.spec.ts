import * as capnp from "capnp-ts";
import { spawnSync } from "child_process";
import tap from "tap";

import "./parity-test.capnp.js";

const SCHEMA_DIR = __dirname;
const SCHEMA_FILE = "parity-test.capnp";

function spawn(args: string[], input?: Buffer): Buffer {
  const res = spawnSync("capnp", args, {
    cwd: SCHEMA_DIR,
    input,
    maxBuffer: 64 * 1024 * 1024,
  });
  if (res.status !== 0) {
    throw new Error(`capnp ${args.join(" ")} failed: ${res.stderr.toString()}`);
  }
  return res.stdout;
}

function toArrayBuffer(buf: Buffer): ArrayBuffer {
  const ab = new ArrayBuffer(buf.byteLength);
  new Uint8Array(ab).set(buf);
  return ab;
}

function capnpEncode(text: string, rootType: string, packed = false): ArrayBuffer {
  const args = ["encode"];
  if (packed) args.push("--packed");
  args.push(SCHEMA_FILE, rootType);
  return toArrayBuffer(spawn(args, Buffer.from(text)));
}

function capnpDecode(buf: ArrayBuffer, rootType: string, packed = false): string {
  const args = ["decode"];
  if (packed) args.push("--packed");
  args.push(SCHEMA_FILE, rootType);
  return spawn(args, Buffer.from(buf)).toString();
}

function buffersEqual(a: ArrayBuffer, b: ArrayBuffer): boolean {
  if (a.byteLength !== b.byteLength) return false;
  const ua = new Uint8Array(a);
  const ub = new Uint8Array(b);
  for (let i = 0; i < ua.byteLength; i++) if (ua[i] !== ub[i]) return false;
  return true;
}

const HAS_CAPNP = spawnSync("capnp", ["--version"], { cwd: SCHEMA_DIR }).status === 0;

interface Case {
  name: string;
  type: string;
  text: string;
}

const CASES: Case[] = [
  {
    name: "TestAllTypes: empty (all defaults are zero/false/null)",
    type: "TestAllTypes",
    text: `()`,
  },
  {
    name: "TestAllTypes: bool + every integer width",
    type: "TestAllTypes",
    text: `(boolField = true, int8Field = -1, int16Field = -2, int32Field = -3, int64Field = -4, uInt8Field = 1, uInt16Field = 2, uInt32Field = 3, uInt64Field = 4)`,
  },
  {
    name: "TestAllTypes: integer extremes",
    type: "TestAllTypes",
    text: `(int8Field = -128, int16Field = -32768, int32Field = -2147483648, int64Field = -9223372036854775808, uInt8Field = 255, uInt16Field = 65535, uInt32Field = 4294967295, uInt64Field = 18446744073709551615)`,
  },
  {
    name: "TestAllTypes: integer extremes (max positive signed)",
    type: "TestAllTypes",
    text: `(int8Field = 127, int16Field = 32767, int32Field = 2147483647, int64Field = 9223372036854775807)`,
  },
  {
    name: "TestAllTypes: floats with sign + magnitude",
    type: "TestAllTypes",
    text: `(float32Field = 1234.5, float64Field = -123e45)`,
  },
  {
    name: "TestAllTypes: float special values (nan, inf, -inf)",
    type: "TestAllTypes",
    text: `(float32Field = nan, float64Field = inf)`,
  },
  {
    name: "TestAllTypes: float extremes",
    type: "TestAllTypes",
    text: `(float32Field = 3.402823e38, float64Field = 1.7976931348623157e308)`,
  },
  {
    name: "TestAllTypes: float denormals",
    type: "TestAllTypes",
    text: `(float32Field = 1e-38, float64Field = 5e-324)`,
  },
  {
    name: "TestAllTypes: text (ASCII)",
    type: "TestAllTypes",
    text: `(textField = "hello world")`,
  },
  {
    name: "TestAllTypes: text (multibyte UTF-8)",
    type: "TestAllTypes",
    text: `(textField = "♫ é ✓ 漢字")`,
  },
  {
    name: "TestAllTypes: text (empty)",
    type: "TestAllTypes",
    text: `(textField = "")`,
  },
  {
    name: "TestAllTypes: data",
    type: "TestAllTypes",
    text: `(dataField = "abcd")`,
  },
  {
    name: "TestAllTypes: data (with non-ASCII bytes)",
    type: "TestAllTypes",
    text: `(dataField = 0x"00 ff 7e 80")`,
  },
  {
    name: "TestAllTypes: enum (each value)",
    type: "TestAllTypes",
    text: `(enumField = foo)`,
  },
  {
    name: "TestAllTypes: nested struct (1 level)",
    type: "TestAllTypes",
    text: `(structField = (int32Field = 42, textField = "nested"))`,
  },
  {
    name: "TestAllTypes: deeply nested struct (3 levels)",
    type: "TestAllTypes",
    text: `(structField = (structField = (structField = (int32Field = 1, textField = "deep"))))`,
  },
  {
    name: "TestAllTypes: void list",
    type: "TestAllTypes",
    text: `(voidList = [void, void, void, void, void])`,
  },
  {
    name: "TestAllTypes: bool list (bit-packed)",
    type: "TestAllTypes",
    text: `(boolList = [true, false, true, true, false, true, false, false, true])`,
  },
  {
    name: "TestAllTypes: int8 list with extremes",
    type: "TestAllTypes",
    text: `(int8List = [-128, 127, 0, -1, 1])`,
  },
  {
    name: "TestAllTypes: int16 list with extremes",
    type: "TestAllTypes",
    text: `(int16List = [-32768, 32767, 0])`,
  },
  {
    name: "TestAllTypes: int32 list with extremes",
    type: "TestAllTypes",
    text: `(int32List = [-2147483648, 2147483647, 0])`,
  },
  {
    name: "TestAllTypes: int64 list with extremes",
    type: "TestAllTypes",
    text: `(int64List = [-9223372036854775808, 9223372036854775807, 0])`,
  },
  {
    name: "TestAllTypes: uint8 list with extremes",
    type: "TestAllTypes",
    text: `(uInt8List = [0, 255, 128])`,
  },
  {
    name: "TestAllTypes: uint16 list with extremes",
    type: "TestAllTypes",
    text: `(uInt16List = [0, 65535, 32768])`,
  },
  {
    name: "TestAllTypes: uint32 list with extremes",
    type: "TestAllTypes",
    text: `(uInt32List = [0, 4294967295, 2147483648])`,
  },
  {
    name: "TestAllTypes: uint64 list with extremes",
    type: "TestAllTypes",
    text: `(uInt64List = [0, 18446744073709551615, 9223372036854775808])`,
  },
  {
    name: "TestAllTypes: float32 list with special values",
    type: "TestAllTypes",
    text: `(float32List = [0, 1.0, -1.0, nan, inf, -inf])`,
  },
  {
    name: "TestAllTypes: float64 list with special values",
    type: "TestAllTypes",
    text: `(float64List = [0, 1.0, -1.0, nan, inf, -inf])`,
  },
  {
    name: "TestAllTypes: text list",
    type: "TestAllTypes",
    text: `(textList = ["foo", "bar", "baz", ""])`,
  },
  {
    name: "TestAllTypes: data list",
    type: "TestAllTypes",
    text: `(dataList = ["abc", "def", 0x"00 01"])`,
  },
  {
    name: "TestAllTypes: struct list (composite)",
    type: "TestAllTypes",
    text: `(structList = [(int32Field = 1), (int32Field = 2), (int32Field = 3)])`,
  },
  {
    name: "TestAllTypes: enum list",
    type: "TestAllTypes",
    text: `(enumList = [foo, bar, baz, qux, quux, corge, grault, garply])`,
  },
  {
    name: "TestAllTypes: every field populated",
    type: "TestAllTypes",
    text: `(voidField = void, boolField = true, int8Field = -128, int16Field = -32768, int32Field = -2147483648, int64Field = -9223372036854775808, uInt8Field = 255, uInt16Field = 65535, uInt32Field = 4294967295, uInt64Field = 18446744073709551615, float32Field = 1234.5, float64Field = -123e45, textField = "everything", dataField = "data", structField = (int32Field = 99), enumField = garply, voidList = [void], boolList = [true, false], int8List = [1, -1], int16List = [2, -2], int32List = [3, -3], int64List = [4, -4], uInt8List = [5, 6], uInt16List = [7, 8], uInt32List = [9, 10], uInt64List = [11, 12], float32List = [1.5, -2.5], float64List = [3.5, -4.5], textList = ["a", "b"], dataList = ["c", "d"], structList = [(int32Field = 1)], enumList = [foo, bar])`,
  },
  {
    name: "TestDefaults: empty (defaults fill in via XOR mask)",
    type: "TestDefaults",
    text: `()`,
  },
  {
    name: "TestDefaults: override every field",
    type: "TestDefaults",
    text: `(boolField = false, int8Field = 0, int16Field = 0, int32Field = 0, int64Field = 0, uInt8Field = 0, uInt16Field = 0, uInt32Field = 0, uInt64Field = 0, float32Field = 0, float64Field = 0, textField = "", dataField = "", structField = (int32Field = 1), enumField = foo, voidList = [], boolList = [], int8List = [], int16List = [], int32List = [], int64List = [], uInt8List = [], uInt16List = [], uInt32List = [], uInt64List = [], float32List = [], float64List = [], textList = [], dataList = [], structList = [], enumList = [])`,
  },
  {
    name: "TestDefaults: partial override (mix of defaults and values)",
    type: "TestDefaults",
    text: `(int32Field = 42, textField = "override", enumField = garply)`,
  },
];

tap.test("parity against C++ reference implementation", { skip: !HAS_CAPNP ? "capnp binary not on PATH" : undefined }, (t) => {
  for (const c of CASES) {
    void t.test(c.name, (t) => {
      const refUnpacked = capnpEncode(c.text, c.type, false);
      const refPacked = capnpEncode(c.text, c.type, true);
      const refText = capnpDecode(refUnpacked, c.type);

      // Read parity: C++ unpacked bytes -> capnp-ts reads -> re-serializes -> byte-exact match.
      const m1 = new capnp.Message(refUnpacked.slice(0), false);
      const out1 = m1.toArrayBuffer();
      t.ok(buffersEqual(out1, refUnpacked), "unpacked round trip preserves bytes");

      // Cross-format: C++ packed -> capnp-ts unpacks -> re-serializes unpacked -> matches C++ unpacked.
      const m2 = new capnp.Message(refPacked.slice(0));
      const out2 = m2.toArrayBuffer();
      t.ok(buffersEqual(out2, refUnpacked), "C++-packed -> ts -> unpacked matches C++ unpacked");

      // Cross-format: C++ unpacked -> capnp-ts packs -> C++ unpacks -> text matches.
      const m3 = new capnp.Message(refUnpacked.slice(0), false);
      const out3packed = m3.toPackedArrayBuffer();
      const text3 = capnpDecode(out3packed, c.type, true);
      t.equal(text3, refText, "ts-packed round trips through C++ decode");

      t.end();
    });
  }

  t.end();
});
