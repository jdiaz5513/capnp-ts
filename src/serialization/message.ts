/**
 * @author jdiaz5513
 */

import initTrace from 'debug';

import {DEFAULT_BUFFER_SIZE, MAX_UINT32} from '../constants';
import {
  INVARIANT_UNREACHABLE_CODE,
  MSG_NO_SEGMENTS_IN_ARENA,
  MSG_SEGMENT_HAS_DATA,
  MSG_SEGMENT_ID_TOO_LARGE,
  MSG_SEGMENT_OUT_OF_BOUNDS,
  MSG_SEGMENT_TOO_SMALL,
  NOT_IMPLEMENTED,
} from '../errors';
import {format, pad, padToWord, repeat} from '../util';
import {Arena, SingleSegmentArena} from './arena';
import {pack, unpack} from './packing';
import {PointerType} from './pointers';
import {Struct, StructCtor} from './pointers';
import {Segment} from './segment';

const trace = initTrace('capnp:message');
trace('load');

export type MessageSource = Arena | ArrayBuffer | ArrayBuffer[];

export class Message {

  private readonly _arena: Arena;

  private _firstSegment: Segment;

  private _segments: Segment[];

  /**
   * Creates a new Message, optionally preallocating its segments from existing data.
   *
   * When dealing with packed data, use the `Message.fromPacked*` factory methods instead.
   *
   * @constructor {Message}
   * @param {MessageSource} [source=new SingleSegmentArena()] The message source. If an ArrayBuffer or array of
   * ArrayBuffers is provided, the message will be preallocated with the existing buffer data. This is the first step to
   * read from an unpacked message buffer. If an Arena is provided instead, that arena will be used for segment
   * allocation and the message will be empty. A message will be created with an empty SingleSegmentArena if no source
   * is provided.
   */

  constructor(source: MessageSource = new SingleSegmentArena()) {

    if (source instanceof ArrayBuffer) {

      this._arena = new SingleSegmentArena(source);
      this._preallocateSegments();

    } else if (source instanceof Array) {

      // this._arena = new MultiSegmentArena(source);
      // this._preallocateSegments();

      throw new Error(format(NOT_IMPLEMENTED, 'new Message(ArrayBuffer[])'));

    } else {

      let firstSegment: Segment;

      this._arena = source;

      // When passing in an Arena as the source we expect it to be empty.

      switch (this._arena.getNumSegments()) {

        case 0:

          firstSegment = this._allocateSegment(DEFAULT_BUFFER_SIZE);

          break;

        case 1:

          firstSegment = this.getSegment(0);

          if (firstSegment.byteOffset !== 0) throw new Error(MSG_SEGMENT_HAS_DATA);

          if (!firstSegment.hasCapacity(8)) throw new Error(MSG_SEGMENT_TOO_SMALL);

          break;

        default:

          throw new Error(MSG_SEGMENT_HAS_DATA);

      }

      // Allocate the root pointer.

      this._firstSegment.allocate(8);

    }

    trace('Instantiated message %s.', this);

  }

  /**
   * Read a message from a packed array buffer. This packed buffer must contain segment framing headers.
   *
   * @static
   * @param {ArrayBuffer} packed The packed message.
   * @returns {Message} A new message instance.
   */

  static fromPackedBuffer(packed: ArrayBuffer): Message {

    return new this(this.getFramedSegments(unpack(packed)));

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

    return new this(unpack(packed));

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

    if (this._segments === undefined) {

      this._segments = [];
      this._segments[0] = this._firstSegment;

    }

    if (this._segments === undefined) throw new Error(INVARIANT_UNREACHABLE_CODE);

    const [id, buffer] = this._arena.allocate(byteLength, this._segments);

    if (id > MAX_UINT32) throw new Error(format(MSG_SEGMENT_ID_TOO_LARGE, id));

    return this._setSegment(id, buffer);

  }

  dump(): string {

    let r = '';

    if (this._segments === undefined) {

      if (this._firstSegment === undefined) return '\n================\nNo Segments\n================\n';

      this._segments = [this._firstSegment];

    }

    for (let i = 0; i < this._segments.length; i++) {

      r += `\n================\nSegment #${i}\n================\n`;

      const {buffer, byteOffset} = this._segments[i];
      const b = new Uint8Array(buffer, 0, byteOffset);

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

  getSegment(id: number): Segment {

    if (id < 0 || id >= this._arena.getNumSegments()) {

      throw new Error(format(MSG_SEGMENT_OUT_OF_BOUNDS, this, id));

    }

    const s = this._getSegment(id);

    if (s !== undefined) return s;

    return this._setSegment(id, this._arena.getBuffer(id));

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

  toArrayBuffer(): ArrayBuffer {

    const streamFrame = this._getStreamFrame();

    const segments: Segment[] = this._segments.filter((s) => s !== undefined);

    // Add space for the stream framing.

    const totalLength = streamFrame.byteLength + segments.reduce((l, s) => l + padToWord(s.byteOffset), 0);
    const out = new Uint8Array(new ArrayBuffer(totalLength));
    let o = streamFrame.byteLength;

    out.set(new Uint8Array(streamFrame));

    segments.forEach((s) => {

      const segmentLength = padToWord(s.byteOffset);
      out.set(new Uint8Array(s.buffer, 0, segmentLength), o);

      o += segmentLength;

    });

    return out.buffer;

  }

  toPackedArrayBuffer(): ArrayBuffer {

    return pack(this.toArrayBuffer());

  }

  private _allocateSegment(_byteLength: number): Segment {

    throw new Error(format(NOT_IMPLEMENTED, 'Message.prototype._allocateSegment'));

  }

  private _getSegment(id: number): Segment|undefined {

    if (this._segments === undefined) {

      if (id === 0 && this._firstSegment && this._firstSegment.message !== undefined) return this._firstSegment;

      return undefined;

    }

    return this._segments[id];

  }

  private _getStreamFrame(): ArrayBuffer {

    if (this._segments === undefined) {

      if (!this._firstSegment) {

        // Just return a single zero word for the frame header.

        return new Float64Array(1).buffer;

      }

      this._segments = [this._firstSegment];

    }

    const frameLength = 4 + this._segments.length * 4 + (1 - this._segments.length % 2) * 4;
    const out = new DataView(new ArrayBuffer(frameLength));

    trace('Writing message stream frame with segment count: %d.', this._segments.length);

    out.setUint32(0, this._segments.length - 1, true);

    this._segments.forEach((s, i) => {

      trace('Message segment %d word count: %d.', s.id, s.byteOffset / 8);

      out.setUint32(i * 4 + 4, s.byteOffset / 8, true);

    });

    return out.buffer;

  }

  private _preallocateSegments(): void {

    const numSegments = this._arena.getNumSegments();

    if (numSegments < 1) throw new Error(MSG_NO_SEGMENTS_IN_ARENA);

    this._segments = new Array(numSegments);

    for (let i = 0; i < numSegments; i++) {

      // Set up each segment so that they're fully allocated to the extents of the existing buffers.

      const buffer = this._arena.getBuffer(i);
      const segment = new Segment(i, this, buffer);
      segment.byteLength = buffer.byteLength;
      segment.byteOffset = buffer.byteLength;

      this._segments[i] = segment;

    }

    this._firstSegment = this._segments[0];

  }

  private _setSegment(id: number, buffer: ArrayBuffer): Segment {

    if (this._segments === undefined) {

      if (id === 0) {

        trace('Initializing first segment in %s.', this);

        this._firstSegment = new Segment(id, this, buffer);
        return this._firstSegment;

      }

      trace('Lazily allocating segment map in %s.', this);

      this._segments = [];

      this._segments[0] = this._firstSegment;

    } else if (this._segments[id]) {

      trace('Reallocating existing segment %d in %s.', id, this);

      this._segments[id].buffer = buffer;
      this._segments[id].byteLength = buffer.byteLength;

      return this._segments[id];

    }

    trace('Adding segment %d to %s', id, this);

    const s = new Segment(id, this, buffer);

    this._segments[id] = s;

    return s;

  }

}
