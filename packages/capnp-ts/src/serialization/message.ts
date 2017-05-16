/**
 * @author jdiaz5513
 */

import initTrace from 'debug';

import {DEFAULT_BUFFER_SIZE} from '../constants';
import {MSG_NO_SEGMENTS_IN_ARENA, MSG_SEGMENT_OUT_OF_BOUNDS, MSG_SEGMENT_TOO_SMALL} from '../errors';
import {format, pad, padToWord, repeat} from '../util';
import {Arena, MultiSegmentArena, SingleSegmentArena} from './arena';
import {pack, unpack} from './packing';
import {PointerType} from './pointers';
import {Struct, StructCtor} from './pointers';
import {Segment} from './segment';

const trace = initTrace('capnp:message');
trace('load');

export class Message {

  private readonly _arena: Arena;

  private _segments: Segment[];

  /**
   * Creates a new Message, optionally using a provided arena for segment allocation.
   *
   * When dealing with existing data, use the `Message.from*` factory methods instead.
   *
   * @constructor {Message}
   * @param {Arena} [arena=new SingleSegmentArena()] The arena to use for allocating new segments.
   */

  constructor(arena: Arena = new SingleSegmentArena()) {

    this._arena = arena;
    this._segments = [];

    trace('Instantiated message %s.', this);

  }

  /**
   * Read a message from an uncompressed array buffer. This buffer must contain segment framing headers.
   *
   * This is what you'd use to read a message written with `toArrayBuffer()`.
   *
   * @static
   * @param {ArrayBuffer} unpacked The unpacked message as a single array buffer.
   * @returns {Message} A new message instance.
   */

  static fromArrayBuffer(unpacked: ArrayBuffer): Message {

    const message = new this(new MultiSegmentArena(this.getFramedSegments(unpacked)));

    message._preallocateSegments();

    return message;

  }

  /**
   * Read a message from a packed array buffer. This packed buffer must contain segment framing headers.
   *
   * This is most likely the function you want to use if you're reading a message from a buffer, particularly if it was
   * written with `toPackedArrayBuffer()`.
   *
   * @static
   * @param {ArrayBuffer} packed The packed message.
   * @returns {Message} A new message instance.
   */

  static fromPackedArrayBuffer(packed: ArrayBuffer): Message {

    return this.fromArrayBuffer(unpack(packed));

  }

  /**
   * Read a message from a single packed segment.
   *
   * Use of this method is not idiomatic but may prove useful in certain scenarios.
   *
   * @static
   * @param {ArrayBuffer} packed A packed segment _without_ a framing header.
   * @returns {Message} A new message instance.
   */

  static fromPackedUnframedBuffer(packed: ArrayBuffer): Message {

    return this.fromSegmentBuffer((unpack(packed)));

  }

  /**
   * Create a new message from an array buffer containing a single unpacked segment. Great for reading canonical
   * messages without a framing header.
   *
   * @static
   * @param {ArrayBuffer} buffer A buffer containing the raw segment data.
   * @returns {Message} A new message instance.
   */

  static fromSegmentBuffer(buffer: ArrayBuffer): Message {

    const message = new this(new SingleSegmentArena(buffer));

    message._preallocateSegments();

    return message;

  }

  /**
   * Given an _unpacked_ message with a segment framing header, this will generate an ArrayBuffer for each segment in
   * the message.
   *
   * This method is not typically called directly, but can be useful in certain cases.
   *
   * @static
   * @param {ArrayBuffer} message An unpacked message with a framing header.
   * @returns {ArrayBuffer[]} An array of buffers containing the segment data.
   */

  static getFramedSegments(message: ArrayBuffer): ArrayBuffer[] {

    const dv = new DataView(message);

    const segmentCount = dv.getUint32(0, true) + 1;

    const segments: ArrayBuffer[] = new Array(segmentCount);

    trace('reading %d framed segments from stream', segmentCount);

    let byteOffset = 4 + segmentCount * 4;
    byteOffset += byteOffset % 8;

    for (let i = 0; i < segmentCount; i++) {

      const byteLength = dv.getUint32(4 + i * 4, true) * 8;

      segments[i] = message.slice(byteOffset, byteOffset + byteLength);

      byteOffset += byteLength;

    }

    return segments;

  }

  allocateSegment(byteLength: number): Segment {

    trace('Need to allocate %x bytes from the arena for %s.', byteLength, this);

    const res = this._arena.allocate(byteLength, this._segments);

    if (res.id === this._segments.length) {

      // Note how we're only allowing new segments in if they're exactly the next one in the array. There is no logical
      // reason for segments to be created out of order.

      this._segments.push(new Segment(res.id, this, res.buffer));

    } else if (res.id < 0 || res.id > this._segments.length) {

      throw new Error(format(MSG_SEGMENT_OUT_OF_BOUNDS, res.id, this));

    } else {

      this._segments[res.id].replaceBuffer(res.buffer);

    }

    return this._segments[res.id];

  }

  /**
   * Create a pretty-printed string dump of this message; incredibly useful for debugging.
   *
   * WARNING: Do not call this method on large messages!
   *
   * @returns {string} A big steaming pile of pretty hex digits.
   */

  dump(): string {

    let r = '';

    if (this._segments.length === 0) return '\n================\nNo Segments\n================\n';

    for (let i = 0; i < this._segments.length; i++) {

      r += `\n================\nSegment #${i}\n================\n`;

      const {buffer, byteLength} = this._segments[i];
      const b = new Uint8Array(buffer, 0, byteLength);

      for (let j = 0; j < b.byteLength; j += 16) {

        r += `\n${pad(j.toString(16), 8)}: `;
        let s = '';
        let k;

        for (k = 0; k < 16; k++) {

          if (j + k >= b.byteLength) break;

          const v = b[j + k];

          r += `${pad(v.toString(16), 2)} `;

          s += v > 32 && v < 255 ? String.fromCharCode(v) : '·';

          if (k === 7) r += ' ';

        }

        r += `${repeat((17 - k) * 3, ' ')}${s}`;

      }

    }

    r += '\n';

    return r;

  }

  /**
   * Get a struct pointer for the root of this message. This is primarily used when reading a message; it will not
   * overwrite existing data.
   *
   * @template T
   * @param {StructCtor<T>} RootStruct The struct type to use as the root.
   * @returns {T} A struct representing the root of the message.
   */

  getRoot<T extends Struct>(RootStruct: StructCtor<T>): T {

    const root = new RootStruct(this.getSegment(0), 0);

    root._validate(PointerType.STRUCT, undefined, RootStruct._size);

    return root;

  }

  /**
   * Get a segment by its id.
   *
   * This will lazily allocate the first segment if it doesn't already exist.
   *
   * @param {number} id The segment id.
   * @returns {Segment} The requested segment.
   */

  getSegment(id: number): Segment {

    const segmentLength = this._segments.length;

    if (id === 0 && segmentLength === 0) {

      // Segment zero is special. If we have no segments in the arena we'll want to allocate a new one and leave room
      // for the root pointer.

      const arenaSegments = this._arena.getNumSegments();

      if (arenaSegments === 0) {

        this.allocateSegment(DEFAULT_BUFFER_SIZE);

      } else {

        // Okay, the arena already has a buffer we can use. This is totally fine.

        this._segments[0] = new Segment(0, this, this._arena.getBuffer(0));

      }

      if (!this._segments[0].hasCapacity(8)) throw new Error(MSG_SEGMENT_TOO_SMALL);

      // This will leave room for the root pointer.

      this._segments[0].allocate(8);

      return this._segments[0];

    }

    if (id < 0 || id >= segmentLength) throw new Error(format(MSG_SEGMENT_OUT_OF_BOUNDS, this, id));

    return this._segments[id];

  }

  /**
   * Initialize a new message using the provided struct type as the root.
   *
   * @template T
   * @param {StructCtor<T>} RootStruct The struct type to use as the root.
   * @returns {T} An initialized struct pointing to the root of the message.
   */

  initRoot<T extends Struct>(RootStruct: StructCtor<T>): T {

    const root = new RootStruct(this.getSegment(0), 0);

    root._initStruct(RootStruct._size);

    trace('Initialized root pointer %s for %s.', root, this);

    return root;

  }

  toString() {

    return `Message_arena:${this._arena}`;

  }

  /**
   * Combine the contents of this message's segments into a single array buffer and prepend a stream framing header
   * containing information about the following segment data.
   *
   * @returns {ArrayBuffer} An ArrayBuffer with the contents of this message.
   */

  toArrayBuffer(): ArrayBuffer {

    const streamFrame = this._getStreamFrame();

    // Make sure the first segment is allocated.

    if (this._segments.length === 0) this.getSegment(0);

    const segments = this._segments;

    // Add space for the stream framing.

    const totalLength = streamFrame.byteLength + segments.reduce((l, s) => l + padToWord(s.byteLength), 0);
    const out = new Uint8Array(new ArrayBuffer(totalLength));
    let o = streamFrame.byteLength;

    out.set(new Uint8Array(streamFrame));

    segments.forEach((s) => {

      const segmentLength = padToWord(s.byteLength);
      out.set(new Uint8Array(s.buffer, 0, segmentLength), o);

      o += segmentLength;

    });

    return out.buffer;

  }

  /**
   * Like `toArrayBuffer()`, but also applies the packing algorithm to the output. This is typically what you want to
   * use if you're sending the message over a network link or other slow I/O interface where size matters.
   *
   * @returns {ArrayBuffer} A packed message.
   */

  toPackedArrayBuffer(): ArrayBuffer {

    return pack(this.toArrayBuffer());

  }

  /**
   * This method is called on messages that were constructed with existing data to prepopulate the segments array with
   * everything we can find in the arena. Each segment will have it's `byteLength` set to the size of its buffer.
   *
   * Technically speaking, the message's segments will be "full" after calling this function. Calling this on your own
   * may void your warranty.
   *
   * @protected
   * @returns {void}
   */

  protected _preallocateSegments(): void {

    const numSegments = this._arena.getNumSegments();

    if (numSegments < 1) throw new Error(MSG_NO_SEGMENTS_IN_ARENA);

    this._segments = new Array(numSegments);

    for (let i = 0; i < numSegments; i++) {

      // Set up each segment so that they're fully allocated to the extents of the existing buffers.

      const buffer = this._arena.getBuffer(i);
      const segment = new Segment(i, this, buffer, buffer.byteLength);

      this._segments[i] = segment;

    }

  }

  private _getStreamFrame(): ArrayBuffer {

    const length = this._segments.length;

    if (length === 0) {

      // Don't bother allocating the first segment, just return a single zero word for the frame header.

      return new Float64Array(1).buffer;

    }

    const frameLength = 4 + length * 4 + (1 - length % 2) * 4;
    const out = new DataView(new ArrayBuffer(frameLength));

    trace('Writing message stream frame with segment count: %d.', length);

    out.setUint32(0, length - 1, true);

    this._segments.forEach((s, i) => {

      trace('Message segment %d word count: %d.', s.id, s.byteLength / 8);

      out.setUint32(i * 4 + 4, s.byteLength / 8, true);

    });

    return out.buffer;

  }

}
