/**
 * @author jdiaz5513
 */

import initTrace from 'debug';

import { MAX_SAFE_INTEGER, VAL32 } from '../constants';
import { pad } from '../util';
import { Uint64 } from './uint64';

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

  /**
   * Parse a hexadecimal string in **big endian format** as an Int64 value.
   *
   * The value will be negative if the string is either preceded with a `-` sign, or already in the negative 2's
   * complement form.
   *
   * @static
   * @param {string} source The source string.
   * @returns {Int64} The string parsed as a 64-bit signed integer.
   */

  static fromHexString(source: string): Int64 {

    if (source.substr(0, 2) === '0x') source = source.substr(2);

    if (source.length < 1) return Int64.fromNumber(0);

    const neg = source[0] === '-';

    if (neg) source = source.substr(1);

    source = pad(source, 16);

    if (source.length !== 16) throw new RangeError('Source string must contain at most 16 hexadecimal digits.');

    const bytes = source.toLowerCase().replace(/[^\da-f]/g, '');
    const buf = new Uint8Array(new ArrayBuffer(8));

    for (let i = 0; i < 8; i++) buf[7 - i] = parseInt(bytes.substr(i * 2, 2), 16);

    const val = new Int64(buf);

    if (neg) val.negate();

    return val;

  }

  static fromUint8Array(source: Uint8Array, offset = 0, noCopy = false): Int64 {

    if (noCopy) return new this(source.subarray(offset, offset + 8));

    return new this(new Uint8Array(source.buffer.slice(source.byteOffset + offset, source.byteOffset + offset + 8)));

  }

  equals(other: Int64): boolean {

    return super.equals(other);

  }

  inspect() {

    return `[Int64 ${this.toString(10)} 0x${this.toHexString()}]`;

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

  toHexString(): string {

    const b = this.buffer;
    const negate = b[7] & 0x80;

    if (negate) this.negate();

    let hex = '';

    for (let i = 7; i >= 0; i--) {

      let v = b[i].toString(16);

      if (v.length === 1) v = '0' + v;

      hex += v;

    }

    if (negate) {

      this.negate();

      hex = '-' + hex;

    }

    return hex;

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
    const negate = b[7] & 0x80;

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
