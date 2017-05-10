/**
 * @author jdiaz5513
 */

import {
  getHammingWeight,
  getTagByte,
  getUnpackedByteLength,
  getZeroByteCount,
  pack,
  unpack,
} from '../../../lib/serialization/packing';
import {compareBuffers, readFileBuffer, tap} from '../../util';

const TAG_DATA = [
  {tag: 0b00000000, weight: 0, word: [0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]},
  {tag: 0b00110001, weight: 3, word: [0x09, 0x00, 0x00, 0x00, 0x04, 0x01, 0x00, 0x00]},
  {tag: 0b00000001, weight: 1, word: [0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]},
  {tag: 0b11111111, weight: 8, word: [0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff]},
  {tag: 0b10000000, weight: 1, word: [0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xff]},
  {tag: 0b11111111, weight: 8, word: [0x0a, 0x15, 0x01, 0xac, 0x6d, 0x9f, 0x03, 0xf2]},
  {tag: 0b00111111, weight: 6, word: [0x41, 0x53, 0x53, 0x48, 0x41, 0x54, 0x00, 0x00]},
];

const TEST_PACKED = readFileBuffer('test/data/test-packed.bin');
const TEST_UNPACKED = readFileBuffer('test/data/test-unpacked.bin');

tap.test('getHammingWeight()', (t) => {

  t.plan(TAG_DATA.length);

  TAG_DATA.forEach((d) => t.equal(getHammingWeight(d.tag), d.weight));

  t.end();

});

tap.test('getTagByte()', (t) => {

  t.plan(TAG_DATA.length);

  TAG_DATA.forEach((d) => t.equal(getTagByte.apply(null, d.word), d.tag));

  t.end();

});

tap.test('getUnpackedByteLength()', (t) => {

  t.equal(getUnpackedByteLength(TEST_PACKED), TEST_UNPACKED.byteLength);

  t.end();

});

tap.test('getZeroByteCount()', (t) => {

  t.plan(TAG_DATA.length);

  TAG_DATA.forEach((d) => t.equal(getZeroByteCount.apply(null, d.word), 8 - d.weight));

  t.end();

});


tap.test('pack()', (t) => {

  compareBuffers(t, pack(TEST_UNPACKED), TEST_PACKED);

  t.end();

});

tap.test('unpack()', (t) => {

  compareBuffers(t, unpack(TEST_PACKED), TEST_UNPACKED);

  t.end();

});
