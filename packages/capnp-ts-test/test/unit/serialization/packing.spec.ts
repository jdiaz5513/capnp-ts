/**
 * @author jdiaz5513
 */

import tap from "tap";

import {
  getHammingWeight,
  getTagByte,
  getUnpackedByteLength,
  getZeroByteCount,
  pack,
  unpack,
} from "capnp-ts/src/serialization/packing";
import { compareBuffers, readFileBuffer } from "../../util";

type Word = [number, number, number, number, number, number, number, number];
type TagData = { tag: number; weight: number; word: Word }[];

const TAG_DATA: TagData = [
  {
    tag: 0b00000000,
    weight: 0,
    word: [0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00],
  },
  {
    tag: 0b00110001,
    weight: 3,
    word: [0x09, 0x00, 0x00, 0x00, 0x04, 0x01, 0x00, 0x00],
  },
  {
    tag: 0b00000001,
    weight: 1,
    word: [0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00],
  },
  {
    tag: 0b11111111,
    weight: 8,
    word: [0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff],
  },
  {
    tag: 0b10000000,
    weight: 1,
    word: [0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xff],
  },
  {
    tag: 0b11111111,
    weight: 8,
    word: [0x0a, 0x15, 0x01, 0xac, 0x6d, 0x9f, 0x03, 0xf2],
  },
  {
    tag: 0b00111111,
    weight: 6,
    word: [0x41, 0x53, 0x53, 0x48, 0x41, 0x54, 0x00, 0x00],
  },
];

// NOTE: for these tests to work `PACK_SPAN_THRESHOLD` must be set to `2`.

const PACKING_DATA = [
  {
    name: "flat",
    packed: readFileBuffer("test/data/flat-packed.bin"),
    unpacked: readFileBuffer("test/data/flat.bin"),
  },
  {
    name: "span",
    packed: readFileBuffer("test/data/span-packed.bin"),
    unpacked: readFileBuffer("test/data/span.bin"),
  },
  {
    name: "test",
    packed: readFileBuffer("test/data/test-packed.bin"),
    unpacked: readFileBuffer("test/data/test.bin"),
  },
  {
    name: "zero",
    packed: readFileBuffer("test/data/zero-packed.bin"),
    unpacked: readFileBuffer("test/data/zero.bin"),
  },
];

void tap.test("getHammingWeight()", (t) => {
  t.plan(TAG_DATA.length);

  TAG_DATA.forEach((d) => t.equal(getHammingWeight(d.tag), d.weight));

  t.end();
});

void tap.test("getTagByte()", (t) => {
  t.plan(TAG_DATA.length);

  TAG_DATA.forEach((d) => t.equal(getTagByte(...d.word), d.tag));

  t.end();
});

void tap.test("getUnpackedByteLength()", (t) => {
  PACKING_DATA.forEach(({ name, packed, unpacked }) => {
    t.equal(getUnpackedByteLength(packed), unpacked.byteLength, name);
  });

  t.end();
});

void tap.test("getZeroByteCount()", (t) => {
  t.plan(TAG_DATA.length);

  TAG_DATA.forEach((d) => t.equal(getZeroByteCount(...d.word), 8 - d.weight));

  t.end();
});

void tap.test("pack()", (t) => {
  PACKING_DATA.forEach(({ name, packed, unpacked }) => {
    compareBuffers(t, pack(unpacked), packed, name);
  });

  t.throws(() => pack(new ArrayBuffer(7)));

  t.end();
});

void tap.test("unpack()", (t) => {
  PACKING_DATA.forEach(({ name, packed, unpacked }) => {
    compareBuffers(t, unpack(packed), unpacked, name);
  });

  t.end();
});
