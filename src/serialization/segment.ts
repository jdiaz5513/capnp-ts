/**
 * @author jdiaz5513
 */

import initTrace from 'debug';

import {MAX_SEGMENT_LENGTH, NATIVE_LITTLE_ENDIAN} from '../constants';
import {SEG_SIZE_OVERFLOW} from '../errors';
import {Int64, Uint64} from '../types';
import {checkSizeOverflow, format, padToWord} from '../util';
import {Message} from './message';
import {Pointer} from './pointers';

const trace = initTrace('capnp:segment');
trace('load');

export class Segment implements DataView {

  buffer: ArrayBuffer;

  byteLength: number;

  byteOffset: number;

  readonly id: number;

  readonly message: Message;

  private readonly _dv: DataView;

  constructor(id: number, message: Message, buffer: ArrayBuffer) {

    this.id = id;
    this.message = message;
    this.buffer = buffer;
    this._dv = new DataView(buffer);

    this.byteLength = buffer.byteLength;
    this.byteOffset = 0;

  }


  allocate(byteLength: number): Pointer {

    let segment: Segment = this;

    byteLength = padToWord(byteLength);

    if (byteLength > MAX_SEGMENT_LENGTH - 8) throw new Error(format(SEG_SIZE_OVERFLOW, byteLength));

    if (!segment.hasCapacity(byteLength)) segment = segment.message.allocateSegment(byteLength);

    const byteOffset = segment.byteOffset;

    segment.byteOffset = checkSizeOverflow(segment.byteOffset + byteLength);

    trace('Allocated %x bytes in %s (requested segment: %s).', byteLength, this, segment);

    return new Pointer(segment, byteOffset);

  }

  /**
   * Quickly fill a number of words in the buffer with zeroes.
   *
   * @param {number} byteOffset The first byte to set to zero.
   * @param {number} wordLength The number of words (not bytes!) to zero out.
   * @returns {void}
   */

  fillZeroWords(byteOffset: number, wordLength: number): void {

    new Float64Array(this.buffer, byteOffset, wordLength * 8).fill(0);

  }

  /**
   * Read a float32 value out of this segment.
   *
   * @param {number} byteOffset The offset in bytes to the value.
   * @returns {number} The value.
   */

  getFloat32(byteOffset: number): number {

    return this._dv.getFloat32(byteOffset, true);

  }

  /**
   * Read a float64 value out of this segment.
   *
   * @param {number} byteOffset The offset in bytes to the value.
   * @returns {number} The value.
   */

  getFloat64(byteOffset: number): number {

    return this._dv.getFloat64(byteOffset, true);

  }

  /**
   * Read an int16 value out of this segment.
   *
   * @param {number} byteOffset The offset in bytes to the value.
   * @returns {number} The value.
   */

  getInt16(byteOffset: number): number {

    return this._dv.getInt16(byteOffset, true);

  }

  /**
   * Read an int32 value out of this segment.
   *
   * @param {number} byteOffset The offset in bytes to the value.
   * @returns {number} The value.
   */

  getInt32(byteOffset: number): number {

    return this._dv.getInt32(byteOffset, true);

  }

  /**
   * Read an int64 value out of this segment.
   *
   * @param {number} byteOffset The offset in bytes to the value.
   * @returns {number} The value.
   */

  getInt64(byteOffset: number): Int64 {

    return new Int64(new Uint8Array(this.buffer.slice(byteOffset, byteOffset + 8)));

  }

  /**
   * Read an int8 value out of this segment.
   *
   * @param {number} byteOffset The offset in bytes to the value.
   * @returns {number} The value.
   */

  getInt8(byteOffset: number): number {

    return this._dv.getInt8(byteOffset);

  }

  /**
   * Read a uint16 value out of this segment.
   *
   * @param {number} byteOffset The offset in bytes to the value.
   * @returns {number} The value.
   */

  getUint16(byteOffset: number): number {

    return this._dv.getUint16(byteOffset, true);

  }

  /**
   * Read a uint32 value out of this segment.
   *
   * @param {number} byteOffset The offset in bytes to the value.
   * @returns {number} The value.
   */

  getUint32(byteOffset: number): number {

    return this._dv.getUint32(byteOffset, true);

  }

  /**
   * Read a uint8 value out of this segment.
   * NOTE: this does not copy the memory region, so updates to the underlying buffer will affect the Uint64 value!
   *
   * @param {number} byteOffset The offset in bytes to the value.
   * @returns {number} The value.
   */

  getUint64(byteOffset: number): Uint64 {

    return new Uint64(new Uint8Array(this.buffer.slice(byteOffset, byteOffset + 8)));

  }

  /**
   * Read a uint8 value out of this segment.
   *
   * @param {number} byteOffset The offset in bytes to the value.
   * @returns {number} The value.
   */

  getUint8(byteOffset: number): number {

    return this._dv.getUint8(byteOffset);

  }

  hasCapacity(byteLength: number): boolean {

    // Test `capacity - allocated >= requested`.

    return this.byteLength - this.byteOffset >= byteLength;

  }

  /**
   * Quickly check the word at the given offset to see if it is equal to zero.
   *
   * PERF_V8: Fastest way to do this is by reading the whole word as a `number` (float64) in the _native_ endian format
   * and see if it's zero.
   *
   * Benchmark: http://jsben.ch/#/Pjooc
   *
   * @param {number} byteOffset The offset to the word.
   * @returns {boolean} `true` if the word is zero.
   */

  isWordZero(byteOffset: number): boolean {

    return this._dv.getFloat64(byteOffset, NATIVE_LITTLE_ENDIAN) === 0;

  }


  /**
   * Write a float32 value to the specified offset.
   *
   * @param {number} byteOffset The offset from the beginning of the buffer.
   * @param {number} val The value to store.
   * @returns {void}
   */

  setFloat32(byteOffset: number, val: number): void {

    this._dv.setFloat32(byteOffset, val, true);

  }

  /**
   * Write an float64 value to the specified offset.
   *
   * @param {number} byteOffset The offset from the beginning of the buffer.
   * @param {number} val The value to store.
   * @returns {void}
   */

  setFloat64(byteOffset: number, val: number): void {

    this._dv.setFloat64(byteOffset, val, true);

  }

  /**
   * Write an int16 value to the specified offset.
   *
   * @param {number} byteOffset The offset from the beginning of the buffer.
   * @param {number} val The value to store.
   * @returns {void}
   */

  setInt16(byteOffset: number, val: number): void {

    this._dv.setInt16(byteOffset, val, true);

  }

  /**
   * Write an int32 value to the specified offset.
   *
   * @param {number} byteOffset The offset from the beginning of the buffer.
   * @param {number} val The value to store.
   * @returns {void}
   */

  setInt32(byteOffset: number, val: number): void {

    this._dv.setInt32(byteOffset, val, true);

  }

  /**
   * Write an int8 value to the specified offset.
   *
   * @param {number} byteOffset The offset from the beginning of the buffer.
   * @param {number} val The value to store.
   * @returns {void}
   */

  setInt8(byteOffset: number, val: number): void {

    this._dv.setInt8(byteOffset, val);

  }

  /**
   * Write an int64 value to the specified offset.
   *
   * @param {number} addr The offset from the beginning of the buffer.
   * @param {Int64} val The value to store.
   * @returns {void}
   */

  setInt64(addr: number, val: Int64): void {

    this._dv.setUint8(addr, val.buffer[0]);
    this._dv.setUint8(addr + 1, val.buffer[1]);
    this._dv.setUint8(addr + 2, val.buffer[2]);
    this._dv.setUint8(addr + 3, val.buffer[3]);

  }

  /**
   * Write a uint16 value to the specified offset.
   *
   * @param {number} byteOffset The offset from the beginning of the buffer.
   * @param {number} value The value to store.
   * @returns {void}
   */

  setUint16(byteOffset: number, value: number): void {

    this._dv.setUint16(byteOffset, value, true);

  }

  /**
   * Write a uint32 value to the specified offset.
   *
   * @param {number} byteOffset The offset from the beginning of the buffer.
   * @param {number} value The value to store.
   * @returns {void}
   */

  setUint32(byteOffset: number, value: number): void {

    this._dv.setUint32(byteOffset, value, true);

  }

  /**
   * Write a uint64 value to the specified offset.
   * TODO: benchmark other ways to perform this write operation.
   *
   * @param {number} byteOffset The offset from the beginning of the buffer.
   * @param {Uint64} value The value to store.
   * @returns {void}
   */

  setUint64(byteOffset: number, value: Uint64): void {

    this._dv.setUint8(byteOffset + 0, value.buffer[0]);
    this._dv.setUint8(byteOffset + 1, value.buffer[1]);
    this._dv.setUint8(byteOffset + 2, value.buffer[2]);
    this._dv.setUint8(byteOffset + 3, value.buffer[3]);

  }

  /**
   * Write a uint8 (byte) value to the specified offset.
   *
   * @param {number} byteOffset The offset from the beginning of the buffer.
   * @param {number} value The value to store.
   * @returns {void}
   */

  setUint8(byteOffset: number, value: number): void {

    this._dv.setUint8(byteOffset, value);

  }

  /**
   * Write a zero word (8 bytes) to the specified offset. This is slightly faster than calling `setUint64` or
   * `setFloat64` with a zero value.
   *
   * Benchmark: http://jsben.ch/#/dUdPI
   *
   * @param {number} byteOffset The offset of the word to set to zero.
   * @returns {void}
   */

  setWordZero(byteOffset: number): void {

    this._dv.setFloat64(byteOffset, 0, NATIVE_LITTLE_ENDIAN);

  }

  toString() {

    return `Segment_id:${this.id},len:0x${this.byteLength.toString(16)},alloc:0x${this.byteOffset.toString(16)}`;

  }

}
