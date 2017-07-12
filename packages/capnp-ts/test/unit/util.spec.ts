import {gen, property} from 'testcheck';

import * as C from '../../lib/constants';
import {RANGE_INVALID_UTF8} from '../../lib/errors';
import * as util from '../../lib/util';
import {compareBuffers, runTestCheck, tap} from '../util';

const BAD_UTF8 = [
  new Uint8Array([0xff, 0xff]),
  new Uint8Array([0xf4, 0xaf, 0x92, 0xa9]),
  new Uint8Array([0xc3]),
  new Uint8Array([0xe0]),
  new Uint8Array([0xe0, 0xbc]),
  new Uint8Array([0xf0]),
  new Uint8Array([0xf0, 0x9f]),
  new Uint8Array([0xf0, 0x9f, 0x92]),
];
const UTF8_BUFFERS = [
  {buf: new Uint8Array([0x21]), str: '!'},
  {buf: new Uint8Array([0xc3, 0xad]), str: 'í'},
  {buf: new Uint8Array([0xe0, 0xbc, 0x80]), str: 'ༀ'},
  {buf: new Uint8Array([0xf0, 0x9f, 0x92, 0xa9]), str: '💩'},
];

tap.test('bufferToHex()', (t) => {

  t.equal(util.bufferToHex(new Uint8Array([0xaa, 0xbb, 0xcc, 0xdd]).buffer), '[aa bb cc dd]');

  t.end();

});

tap.test('checkInt32()', (t) => {

  t.throws(() => util.checkInt32(0xffffffff));

  t.throws(() => util.checkInt32(-0xffffffff));

  t.doesNotThrow(() => util.checkInt32(0x7fffffff));

  t.doesNotThrow(() => util.checkInt32(-0x7fffffff));

  t.end();

});

tap.test('checkUint32()', (t) => {

  t.throws(() => util.checkUint32(0xffffffff + 1));

  t.throws(() => util.checkUint32(-1));

  t.doesNotThrow(() => util.checkUint32(0xffffffff));

  t.doesNotThrow(() => util.checkUint32(0));

  t.end();

});

tap.test('decodeUtf8()', (t) => {

  UTF8_BUFFERS.forEach(({buf, str}) => {

    t.equal(util.decodeUtf8(buf), str);

  });

  BAD_UTF8.forEach((b) => {

    t.throws(() => util.decodeUtf8(b), new RangeError(RANGE_INVALID_UTF8));

  });

  t.end();

});

tap.test('decodeUtf8(encodeUtf8())', (t) => {

  runTestCheck(t, property(gen.string, (s) => util.decodeUtf8(util.encodeUtf8(s)) === s), {numTests: 1000});

  t.end();

});

tap.test('dumpBuffer()', (t) => {

  const buf1 = new Uint8Array(64);

  // Gratuitous? Yes. Awesome? Yes.

  for (let i = 0; i < 11; i++) buf1[i + 1] = "Cap'n Proto".charCodeAt(i);
  for (let i = 0; i < 11; i++) buf1[i + 19] = "Cap'n Proto".charCodeAt(i);
  buf1[0x10] = 0x11;
  buf1[0x11] = 0x05;

  t.equal(util.dumpBuffer(buf1), `
=== buffer[64] ===
00000000: 00 43 61 70 27 6e 20 50  72 6f 74 6f 00 00 00 00    ·Cap'n Proto····
00000010: 11 05 00 43 61 70 27 6e  20 50 72 6f 74 6f 00 00    ···Cap'n Proto··
00000020: 00 00 00 00 00 00 00 00  00 00 00 00 00 00 00 00    ················
00000030: 00 00 00 00 00 00 00 00  00 00 00 00 00 00 00 00    ················
`);

  const buf2Length = C.MAX_BUFFER_DUMP_BYTES + 16;
  const buf2 = new Uint8Array(buf2Length);
  let buf2Wanted = `\n=== buffer[${C.MAX_BUFFER_DUMP_BYTES}] ===`;

  for (let i = 0; i < C.MAX_BUFFER_DUMP_BYTES / 16; i++) {

    buf2Wanted +=
      `\n${util.pad((i * 16).toString(16), 8)}: 00 00 00 00 00 00 00 00  00 00 00 00 00 00 00 00    ················`;

  }

  buf2Wanted += '\n=== (truncated 16 bytes) ===\n';

  t.equal(util.dumpBuffer(buf2), buf2Wanted);
  t.equal(util.dumpBuffer(buf2.buffer), buf2Wanted);

  t.end();

});

tap.test('encodeUtf8()', (t) => {

  UTF8_BUFFERS.forEach(({buf, str}) => {

    // The output buffer might be longer than its contents so we need to slice it.

    const out = util.encodeUtf8(str);
    compareBuffers(t, out.buffer.slice(0, out.byteLength), buf.buffer);

  });

  t.end();

});

tap.test('format()', (t) => {

  t.equal(util.format('%a', 0x0da0beef), '0x0da0beef');
  t.equal(util.format('%b', 0b10101010), '10101010');
  t.equal(util.format('%c', 33), '!');
  t.equal(util.format('%c', '!'), '!');
  t.equal(util.format('%d', 777), '777');
  t.equal(util.format('%f', 777.777777), '777.777777');
  t.equal(util.format('%.2f', 0.771), '.77');
  t.equal(util.format('%0.3f', 0.7777), '0.778');
  t.equal(util.format('%j', {a: 'b'}), '{"a":"b"}');
  t.equal(util.format('%o', parseInt('777', 8)), '0777');
  t.equal(util.format('%s', {toString: () => 'test'}), 'test');
  t.equal(util.format('%x', 0x0badbeef), '0xbadbeef');
  t.equal(util.format('%X', 0x0badbeef), '0xBADBEEF');
  t.equal(util.format('%z', 'verbatim'), 'z');
  t.equal(util.format('hi'), 'hi');

  t.end();

});

tap.test('identity()', (t) => {

  t.equal(util.identity('x'), 'x');

  t.end();

});

tap.test('pad()', (t) => {

  t.equal(util.pad('0', 8), '00000000');
  t.equal(util.pad('0', 8, '='), '=======0');
  t.equal(util.pad('000000000', 8), '000000000');

  t.end();

});

tap.test('padToWord()', (t) => {

  t.equal(util.padToWord(7), 8);
  t.equal(util.padToWord(0), 0);
  t.equal(util.padToWord(9), 16);

  t.end();

});

tap.test('repeat()', (t) => {

  t.equal(util.repeat(10, '0'), '0000000000');
  t.equal(util.repeat(0, 'x'), '');
  t.equal(util.repeat(-1, 'z'), '');

  t.end();

});
