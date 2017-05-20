/**
 * @author jdiaz5513
 */

import initTrace from 'debug';

import {MAX_SAFE_INTEGER, VAL32} from '../constants';
import {Uint64} from './uint64';

const trace = initTrace('capnp:int64');
trace('load');

/**
 * Represents a signed 64-bit integer stored using a Uint8Array in little-endian format.
 *
 * You may convert this to a primitive number by calling `toNumber()` but be wary of precision loss!
 *
 * The value passed in as the source buffer is expected to be in little-endian format.
 */

export class Int64 extends Uint64 {

  static fromArrayBuffer(source: ArrayBuffer, offset = 0, noCopy = false): Int64 {

    if (noCopy) return new this(new Uint8Array(source, offset, 8));

    return new this(new Uint8Array(source.slice(offset, offset + 8)));

  }

  static fromDataView(source: DataView, offset = 0, noCopy = false): Int64 {

    if (noCopy) return new this(new Uint8Array(source.buffer, source.byteOffset + offset, 8));

    return new this(new Uint8Array(source.buffer.slice(source.byteOffset + offset, source.byteLength + offset + 8)));

  }

  static fromNumber(source: number): Int64 {

    const ret = new this(new Uint8Array(8));

    ret.setValue(source);

    return ret;

  }

  static fromUint8Array(source: Uint8Array, offset = 0, noCopy = false): Int64 {

    if (noCopy) return new this(source.subarray(offset, offset + 8));

    return new this(new Uint8Array(source.buffer.slice(source.byteOffset + offset, source.byteOffset + offset + 8)));

  }

  inspect() {

    let hex = '';

    for (let i = 7; i >= 0; i--) {

      let v = this.buffer[i].toString(16);

      if (v.length === 1) v = '0' + v;

      hex += v;

    }

    return `[Int64 ${this.toString(10)} 0x${hex}]`;

  }

  negate() {

    for (let b = this.buffer, carry = 1, i = 0; i < 8; i++) {

      const v = (b[i] ^ 0xff) + carry;

      b[i] = v & 0xff;
      carry = v >> 8;

    }

  }

  setValue(loWord: number, hiWord?: number) {

    let negate = false;
    let lo = loWord;
    let hi = hiWord;

    if (hi === undefined) {

      hi = lo;
      negate = hi < 0;
      hi = Math.abs(hi);
      lo = hi % VAL32;
      hi = hi / VAL32;

      if (hi > VAL32) throw new RangeError(`${loWord} is outside Int64 range`);

      hi = hi >>> 0;

    }

    for (let i = 0; i < 8; i++) {

      this.buffer[i] = lo & 0xff;

      lo = i === 3 ? hi : lo >>> 8;

    }

    if (negate) this.negate();

  }

  /**
   * Convert to a native javascript number.
   *
   * WARNING: do not expect this number to be accurate to integer precision for large (positive or negative) numbers!
   *
   * @param {boolean} allowImprecise If `true`, no check is performed to verify the returned value is accurate;
   * otherwise out-of-range values are clamped to +/-Infinity.
   * @returns {number} A numeric representation of this integer.
   */

  toNumber(allowImprecise?: boolean) {

    const b = this.buffer;
    const negate = b[0] & 0x80;

    let x = 0;
    let carry = 1;
    let i = 0;
    let m = 1;

    while (i < 8) {

      let v = b[i];

      if (negate) {

        v = (v ^ 0xff) + carry;
        carry = v >> 8;
        v = v & 0xff;

      }

      x += v * m;
      m *= 256;
      i++;

    }

    if (!allowImprecise && x >= MAX_SAFE_INTEGER) {

      trace('Coercing out of range value %d to Infinity.', x);

      return negate ? -Infinity : Infinity;

    }

    return negate ? -x : x;

  }

}
