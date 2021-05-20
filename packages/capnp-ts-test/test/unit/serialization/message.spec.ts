import tap from "tap";

import * as C from "capnp-ts/src/constants";
import { Message } from "capnp-ts/src/serialization";
import { MultiSegmentArena } from "capnp-ts/src/serialization/arena";
import { getFramedSegments, preallocateSegments } from "capnp-ts/src/serialization/message";
import { Person } from "../../integration/serialization-demo";
import { compareBuffers, readFileBuffer } from "../../util";

const SEGMENTED_PACKED = readFileBuffer("test/data/segmented-packed.bin");
const SEGMENTED_UNPACKED = readFileBuffer("test/data/segmented.bin");

void tap.test("new Message(ArrayBuffer, false)", (t) => {
  const message = new Message(SEGMENTED_UNPACKED, false);

  compareBuffers(t, message.toArrayBuffer(), SEGMENTED_UNPACKED, "should read segmented messages");

  t.end();
});

void tap.test("new Message(Buffer, false)", (t) => {
  const message = new Message(Buffer.from(SEGMENTED_UNPACKED), false);

  compareBuffers(t, message.toArrayBuffer(), SEGMENTED_UNPACKED, "should read messages from a Buffer");

  t.end();
});

void tap.test("new Message(ArrayBuffer)", (t) => {
  const message = new Message(SEGMENTED_PACKED);

  compareBuffers(t, message.toArrayBuffer(), SEGMENTED_UNPACKED, "should read packed messages");

  t.end();
});

void tap.test("new Message(Buffer)", (t) => {
  const message = new Message(Buffer.from(SEGMENTED_PACKED));

  compareBuffers(t, message.toArrayBuffer(), SEGMENTED_UNPACKED, "should read packed messages from a Buffer");

  t.end();
});

void tap.test("getFramedSegments()", (t) => {
  t.throws(
    () =>
      getFramedSegments(
        new Uint8Array([
          0x00,
          0x00,
          0x00,
          0x00, // need at least 4 more bytes for an empty message
        ]).buffer
      ),
    undefined,
    "should throw when segment counts are missing"
  );

  t.throws(
    () =>
      getFramedSegments(
        new Uint8Array([
          0x00,
          0x00,
          0x00,
          0x01,
          0x00,
          0x00,
          0x00,
          0x00, // need at least 4 more bytes for the second segment length
        ]).buffer
      ),
    undefined,
    "should throw when there are not enough segment counts"
  );

  t.throws(
    () =>
      getFramedSegments(
        new Uint8Array([
          0x00,
          0x00,
          0x00,
          0x00,
          0x10,
          0x00,
          0x00,
          0x00, // should have 16 words in a single segment
          0x00,
          0x00,
          0x00,
          0x00,
          0x00,
          0x00,
          0x00,
          0x00,
          0x00,
          0x00,
          0x00,
          0x00,
          0x00,
          0x00,
          0x00,
          0x00, // but only get 2
        ]).buffer
      ),
    undefined,
    "should throw when message is truncated"
  );

  t.end();
});

void tap.test("Message.allocateSegment()", (t) => {
  const length = C.DEFAULT_BUFFER_SIZE;

  const m1 = new Message();

  m1.allocateSegment(length);
  m1.allocateSegment(length);

  t.throws(() => m1.getSegment(1));

  // Single segment arenas always grow by slightly more than what was allocated.

  t.equal(
    m1.getSegment(0).buffer.byteLength,
    length * 2 + C.MIN_SINGLE_SEGMENT_GROWTH,
    "should replace existing segments"
  );

  const m2 = new Message(new MultiSegmentArena());

  m2.allocateSegment(length);
  m2.allocateSegment(length);

  t.equal(m2.getSegment(1).buffer.byteLength, length, "should allocate new segments");

  t.end();
});

void tap.test("Message.dump()", (t) => {
  const m1 = new Message(new MultiSegmentArena());

  t.equal(
    m1.dump(),
    `================
No Segments
================
`,
    "should print an empty message"
  );

  const m2 = new Message();

  m2.allocateSegment(16).allocate(16);

  t.equal(
    m2.dump(),
    `================
Segment #0
================

=== buffer[16] ===
00000000: 00 00 00 00 00 00 00 00  00 00 00 00 00 00 00 00    ················
`,
    "should print messages"
  );

  t.end();
});

void tap.test("Message.getSegment()", (t) => {
  const s = new Message(new MultiSegmentArena()).getSegment(0);

  t.equal(s.byteLength, 8, "should preallocate segment 0");

  t.throws(() => new Message().getSegment(1), undefined, "should throw when getting out of range segments");

  const m = new Message(new MultiSegmentArena([new ArrayBuffer(2)])); // this is too small to hold the root pointer

  t.throws(() => m.getSegment(0), undefined, "should throw when segment 0 is too small");

  t.end();
});

void tap.test("Message.onCreatePointer()", (t) => {
  // This is why you should cache the result of `getList()` calls and use `List.toArray()` liberally...

  const m = new Message();
  const p = m.initRoot(Person);

  t.throws(
    () => {
      for (let i = 0; i < C.DEFAULT_TRAVERSE_LIMIT + 1; i++) p.getPhones();
    },
    undefined,
    "should throw when exceeding the pointer traversal limit"
  );

  t.end();
});

void tap.test("Message.toArrayBuffer()", (t) => {
  t.equal(new Message().toArrayBuffer().byteLength, 16, "should allocate segment 0 before converting");

  t.end();
});

void tap.test("Message.toPackedArrayBuffer()", (t) => {
  const message = new Message(SEGMENTED_UNPACKED, false);

  compareBuffers(t, message.toPackedArrayBuffer(), SEGMENTED_PACKED, "should pack messages properly");

  t.end();
});

void tap.test("preallocateSegments()", (t) => {
  t.throws(
    () => {
      const message = new Message(new MultiSegmentArena());

      preallocateSegments(message);
    },
    undefined,
    "should throw when preallocating an empty arena"
  );

  t.end();
});
