import {gen, property} from 'testcheck';

import {RANGE_INVALID_UTF8} from '../../lib/errors';
import {
  bufferToHex,
  checkInt32,
  checkUint32,
  decodeUtf8,
  encodeUtf8,
  format,
  identity,
  pad,
  padToWord,
  repeat,
} from '../../lib/util';
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

  t.equal(bufferToHex(new Uint8Array([0xaa, 0xbb, 0xcc, 0xdd]).buffer), '[aa bb cc dd]');

  t.end();

});

tap.test('checkInt32()', (t) => {

  t.throws(() => checkInt32(0xffffffff));

  t.throws(() => checkInt32(-0xffffffff));

  t.doesNotThrow(() => checkInt32(0x7fffffff));

  t.doesNotThrow(() => checkInt32(-0x7fffffff));

  t.end();

});

tap.test('checkUint32()', (t) => {

  t.throws(() => checkUint32(0xffffffff + 1));

  t.throws(() => checkUint32(-1));

  t.doesNotThrow(() => checkUint32(0xffffffff));

  t.doesNotThrow(() => checkUint32(0));

  t.end();

});

tap.test('decodeUtf8()', (t) => {

  UTF8_BUFFERS.forEach(({buf, str}) => {

    t.equal(decodeUtf8(buf), str);

  });

  BAD_UTF8.forEach((b) => {

    t.throws(() => decodeUtf8(b), new RangeError(RANGE_INVALID_UTF8));

  });


  t.end();

});

tap.test('decodeUtf8(encodeUtf8())', (t) => {

  runTestCheck(t, property(gen.string, (s) => decodeUtf8(encodeUtf8(s)) === s), {numTests: 1000});

  t.end();

});

tap.test('encodeUtf8()', (t) => {

  UTF8_BUFFERS.forEach(({buf, str}) => {

    // The output buffer might be longer than its contents so we need to slice it.

    const out = encodeUtf8(str);
    compareBuffers(t, out.buffer.slice(0, out.byteLength), buf.buffer);

  });

  t.end();

});

tap.test('format()', (t) => {

  t.equal(format('%a', 0x0da0beef), '0x0da0beef');
  t.equal(format('%b', 0b10101010), '10101010');
  t.equal(format('%c', 33), '!');
  t.equal(format('%c', '!'), '!');
  t.equal(format('%d', 777), '777');
  t.equal(format('%f', 777.777777), '777.777777');
  t.equal(format('%.2f', 0.771), '.77');
  t.equal(format('%0.3f', 0.7777), '0.778');
  t.equal(format('%j', {a: 'b'}), '{"a":"b"}');
  t.equal(format('%o', parseInt('777', 8)), '0777');
  t.equal(format('%s', {toString: () => 'test'}), 'test');
  t.equal(format('%x', 0x0badbeef), '0xbadbeef');
  t.equal(format('%X', 0x0badbeef), '0xBADBEEF');
  t.equal(format('%z', 'verbatim'), 'z');
  t.equal(format('hi'), 'hi');

  t.end();

});

tap.test('identity()', (t) => {

  t.equal(identity('x'), 'x');

  t.end();

});

tap.test('pad()', (t) => {

  t.equal(pad('0', 8), '00000000');
  t.equal(pad('0', 8, '='), '=======0');
  t.equal(pad('000000000', 8), '000000000');

  t.end();

});

tap.test('padToWord()', (t) => {

  t.equal(padToWord(7), 8);
  t.equal(padToWord(0), 0);
  t.equal(padToWord(9), 16);

  t.end();

});

tap.test('repeat()', (t) => {

  t.equal(repeat(10, '0'), '0000000000');
  t.equal(repeat(0, 'x'), '');
  t.equal(repeat(-1, 'z'), '');

  t.end();

});
