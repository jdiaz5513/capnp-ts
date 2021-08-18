import tap from "tap";

import { MAX_SAFE_INTEGER, MIN_SAFE_INTEGER } from "capnp-ts/src/constants";
import {
  getBitMask,
  getFloat32Mask,
  getFloat64Mask,
  getInt16Mask,
  getInt32Mask,
  getInt64Mask,
  getInt8Mask,
  getUint16Mask,
  getUint32Mask,
  getUint64Mask,
  getUint8Mask,
} from "capnp-ts/src/serialization/mask";
import { Int64, Uint64 } from "capnp-ts/src/types";
import { compareBuffers } from "../../util";

type MaskArray = Array<{ mask: number[]; val: number }>;

const BIT_MASKS = [
  { mask: [0b00000000], bitOffset: 5, val: false },
  { mask: [0b00100000], bitOffset: 5, val: true },
  { mask: [0b00000001], bitOffset: 0, val: true },
  { mask: [0b00100000], bitOffset: 13, val: true },
];

const FLOAT_32_MASKS = [
  { mask: [0x00, 0x00, 0x00, 0x00], val: 0 },
  { mask: [0xdb, 0x0f, 0x49, 0x40], val: Math.PI },
  { mask: [0x00, 0x00, 0x80, 0x7f], val: Infinity },
  { mask: [0x00, 0x00, 0x80, 0xff], val: -Infinity },
  { mask: [0x00, 0x00, 0x20, 0x41], val: 10 },
];

const FLOAT_64_MASKS = [
  { mask: [0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00], val: 0 },
  { mask: [0x18, 0x2d, 0x44, 0x54, 0xfb, 0x21, 0x09, 0x40], val: Math.PI },
  { mask: [0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xf0, 0x7f], val: Infinity },
  { mask: [0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xf0, 0xff], val: -Infinity },
  { mask: [0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x24, 0x40], val: 10 },
];

const INT_16_MASKS = [
  { mask: [0x00, 0x00], val: 0x0000 },
  { mask: [0x78, 0x56], val: 0x5678 },
  { mask: [0x00, 0x80], val: -0x8000 },
  { mask: [0xff, 0x7f], val: 0x7fff },
  { mask: [0xff, 0xff], val: -0x0001 },
  // Testing overflow behavior.
  { mask: [0xff, 0xff], val: 0xffff },
  { mask: [0x00, 0x80], val: 0x8000 },
  { mask: [0x21, 0x22], val: 0xfffffffff + 0x2222 },
];

const INT_32_MASKS = [
  { mask: [0x00, 0x00, 0x00, 0x00], val: 0x00000000 },
  { mask: [0x67, 0x45, 0x23, 0x01], val: 0x01234567 },
  { mask: [0x00, 0x00, 0x00, 0x80], val: -0x80000000 },
  { mask: [0xff, 0xff, 0xff, 0x7f], val: 0x7fffffff },
  { mask: [0xff, 0xff, 0xff, 0xff], val: -0x00000001 },
  // Testing overflow behavior.
  { mask: [0xff, 0xff, 0xff, 0xff], val: 0xffffffff },
  { mask: [0x00, 0x00, 0x00, 0x80], val: 0x80000000 },
  { mask: [0x21, 0x22, 0x00, 0x00], val: 0xfffffffff + 0x2222 },
];

const INT_64_MASKS = [
  {
    mask: [0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00],
    val: 0x0000000000000000,
  },
  {
    mask: [0xde, 0xbc, 0x9a, 0x78, 0x56, 0x34, 0x12, 0x00],
    val: 0x00123456789abcde,
  },
  {
    mask: [0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0xe0, 0xff],
    val: MIN_SAFE_INTEGER,
  },
  {
    mask: [0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0x1f, 0x00],
    val: MAX_SAFE_INTEGER,
  },
  {
    mask: [0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff],
    val: -0x0000000000000001,
  },
];

const INT_8_MASKS = [
  { mask: [0x00], val: 0x00 },
  { mask: [0x78], val: 0x78 },
  { mask: [0x80], val: -0x80 },
  { mask: [0x7f], val: 0x7f },
  { mask: [0xff], val: -0x01 },
  // Testing overflow behavior.
  { mask: [0xff], val: 0xff },
  { mask: [0x80], val: 0x80 },
  { mask: [0x21], val: 0xfffffffff + 0x22 },
];

const UINT_16_MASKS = [
  { mask: [0x00, 0x00], val: 0x0000 },
  { mask: [0x78, 0x56], val: 0x5678 },
  { mask: [0xff, 0xff], val: 0xffff },
  { mask: [0xff, 0x7f], val: 0x7fff },
  { mask: [0x00, 0x80], val: 0x8000 },
  // Testing overflow behavior.
  { mask: [0xff, 0xff], val: -0x0001 },
  { mask: [0x00, 0x80], val: -0x8000 },
  { mask: [0x21, 0x22], val: 0xfffffffff + 0x2222 },
];

const UINT_32_MASKS = [
  { mask: [0x00, 0x00, 0x00, 0x00], val: 0x00000000 },
  { mask: [0x78, 0x56, 0x34, 0x12], val: 0x12345678 },
  { mask: [0xff, 0xff, 0xff, 0x7f], val: 0x7fffffff },
  { mask: [0xff, 0xff, 0xff, 0xff], val: 0xffffffff },
  { mask: [0x00, 0x00, 0x00, 0x80], val: 0x80000000 },
  // Testing overflow behavior.
  { mask: [0x00, 0x00, 0x00, 0x80], val: -0x80000000 },
  { mask: [0xff, 0xff, 0xff, 0xff], val: -0x00000001 },
  { mask: [0x21, 0x22, 0x00, 0x00], val: 0xfffffffff + 0x00002222 },
];

const UINT_64_MASKS = [
  {
    mask: [0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00],
    val: 0x0000000000000000,
  },
  {
    mask: [0xde, 0xbc, 0x9a, 0x78, 0x56, 0x34, 0x12, 0x00],
    val: 0x00123456789abcde,
  },
  {
    mask: [0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0x1f, 0x00],
    val: MAX_SAFE_INTEGER,
  },
  // Negative numbers are negated.
  {
    mask: [0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0x1f, 0x00],
    val: MIN_SAFE_INTEGER,
  },
  {
    mask: [0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00],
    val: -0x0000000000000001,
  },
];

const UINT_8_MASKS = [
  { mask: [0x00], val: 0x00 },
  { mask: [0x78], val: 0x78 },
  { mask: [0x7f], val: 0x7f },
  { mask: [0xff], val: 0xff },
  { mask: [0x80], val: 0x80 },
  // Testing overflow behavior.
  { mask: [0x80], val: -0x80 },
  { mask: [0xff], val: -0x01 },
  { mask: [0x21], val: 0xfffffffff + 0x2222 },
];

function makeMaskTest(name: string, fn: (x: number) => DataView, testData: MaskArray) {
  void tap.test(name, (t) => {
    testData.forEach(({ mask, val }) => {
      compareBuffers(t, fn(val).buffer, new Uint8Array(mask).buffer);
    });

    t.end();
  });
}

void tap.test("getBitMask()", (t) => {
  BIT_MASKS.forEach(({ bitOffset, mask, val }) => {
    compareBuffers(t, getBitMask(val, bitOffset).buffer, new Uint8Array(mask).buffer);
  });

  t.end();
});

void tap.test("getInt64Mask()", (t) => {
  INT_64_MASKS.forEach(({ mask, val }) => {
    compareBuffers(t, getInt64Mask(Int64.fromNumber(val)).buffer, new Uint8Array(mask).buffer);
  });

  t.end();
});

void tap.test("getUint64Mask()", (t) => {
  UINT_64_MASKS.forEach(({ mask, val }) => {
    compareBuffers(t, getUint64Mask(Uint64.fromNumber(val)).buffer, new Uint8Array(mask).buffer);
  });

  t.end();
});

makeMaskTest("getFloat32Mask()", getFloat32Mask, FLOAT_32_MASKS);
makeMaskTest("getFloat64Mask()", getFloat64Mask, FLOAT_64_MASKS);
makeMaskTest("getInt16Mask()", getInt16Mask, INT_16_MASKS);
makeMaskTest("getInt32Mask()", getInt32Mask, INT_32_MASKS);
makeMaskTest("getInt8Mask()", getInt8Mask, INT_8_MASKS);
makeMaskTest("getUint16Mask()", getUint16Mask, UINT_16_MASKS);
makeMaskTest("getUint32Mask()", getUint32Mask, UINT_32_MASKS);
makeMaskTest("getUint8Mask()", getUint8Mask, UINT_8_MASKS);
