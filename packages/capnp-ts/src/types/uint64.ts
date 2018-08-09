/**
 * @author jdiaz5513
 */

import initTrace from "debug";

import { MAX_SAFE_INTEGER, VAL32 } from "../constants";
import { RANGE_INT64_UNDERFLOW } from "../errors";
import { pad } from "../util";

const trace = initTrace("capnp:uint64");
trace("load");

/**
 * Represents an unsigned 64-bit integer stored using a Uint8Array in little-endian format. It's a little bit faster
 * than int64 because we don't need to keep track of the sign bit or perform two's compliment operations on set.
 *
 * You may convert this to a primitive number by calling `toNumber()` but be wary of precision loss!
 *
 * Note that overflow is not implemented, so negative numbers passed into `setValue()` will be negated first.
 *
 * The value passed in as the source buffer is expected to be in little-endian format.
 */

export class Uint64 {
  readonly buffer: Uint8Array;

  /**
   * Creates a new instance; this is a no-frills constructor for speed. Use the factory methods if you need to convert
   * from other types or use a different offset into the buffer.
   *
   * Will throw if the buffer is not at least 8 bytes long.
   *
   * @constructor
   * @param {Uint8Array} buffer The buffer to use for this 64-bit word; the bytes must be in little-endian order.
   */

  constructor(buffer: Uint8Array) {
    if (buffer.byteLength < 8) throw new RangeError(RANGE_INT64_UNDERFLOW);

    this.buffer = buffer;
  }

  static fromArrayBuffer(
    source: ArrayBuffer,
    offset = 0,
    noCopy = false
  ): Uint64 {
    if (noCopy) return new this(new Uint8Array(source, offset, 8));

    return new this(new Uint8Array(source.slice(offset, offset + 8)));
  }

  static fromDataView(source: DataView, offset = 0, noCopy = false): Uint64 {
    if (noCopy) {
      return new this(
        new Uint8Array(source.buffer, source.byteOffset + offset, 8)
      );
    }

    return new this(
      new Uint8Array(
        source.buffer.slice(
          source.byteOffset + offset,
          source.byteLength + offset + 8
        )
      )
    );
  }

  /**
   * Parse a hexadecimal string in **big endian format** as a Uint64 value.
   *
   * @static
   * @param {string} source The source string.
   * @returns {Uint64} The string parsed as a 64-bit unsigned integer.
   */

  static fromHexString(source: string): Uint64 {
    if (source.substr(0, 2) === "0x") source = source.substr(2);

    if (source.length < 1) return Uint64.fromNumber(0);

    if (source[0] === "-") throw new RangeError("Source must not be negative.");

    source = pad(source, 16);

    if (source.length !== 16) {
      throw new RangeError(
        "Source string must contain at most 16 hexadecimal digits."
      );
    }

    const bytes = source.toLowerCase().replace(/[^\da-f]/g, "");
    const buf = new Uint8Array(new ArrayBuffer(8));

    for (let i = 0; i < 8; i++) {
      buf[7 - i] = parseInt(bytes.substr(i * 2, 2), 16);
    }

    return new Uint64(buf);
  }

  static fromNumber(source: number): Uint64 {
    const ret = new this(new Uint8Array(8));

    ret.setValue(source);

    return ret;
  }

  static fromUint8Array(
    source: Uint8Array,
    offset = 0,
    noCopy = false
  ): Uint64 {
    if (noCopy) return new this(source.subarray(offset, offset + 8));

    return new this(
      new Uint8Array(
        source.buffer.slice(
          source.byteOffset + offset,
          source.byteOffset + offset + 8
        )
      )
    );
  }

  equals(other: Uint64): boolean {
    for (let i = 0; i < 8; i++) {
      if (this.buffer[i] !== other.buffer[i]) return false;
    }

    return true;
  }

  inspect() {
    return `[Uint64 ${this.toString(10)} 0x${this.toHexString()}]`;
  }

  /**
   * Faster way to check for zero values without converting to a number first.
   *
   * @returns {boolean} `true` if the contained value is zero.
   * @memberOf Uint64
   */

  isZero(): boolean {
    for (let i = 0; i < 8; i++) {
      if (this.buffer[i] !== 0) return false;
    }

    return true;
  }

  setValue(loWord: number, hiWord?: number) {
    let lo = loWord;
    let hi = hiWord;

    if (hi === undefined) {
      hi = lo;
      hi = Math.abs(hi);
      lo = hi % VAL32;
      hi = hi / VAL32;

      if (hi > VAL32) throw new RangeError(`${loWord} is outside Uint64 range`);

      hi = hi >>> 0;
    }

    for (let i = 0; i < 8; i++) {
      this.buffer[i] = lo & 0xff;
      lo = i === 3 ? hi : lo >>> 8;
    }
  }

  /**
   * Convert to a native javascript number.
   *
   * WARNING: do not expect this number to be accurate to integer precision for large (positive or negative) numbers!
   *
   * @param {boolean} allowImprecise If `true`, no check is performed to verify the returned value is accurate;
   * otherwise out-of-range values are clamped to +Infinity.
   * @returns {number} A numeric representation of this integer.
   */

  toNumber(allowImprecise?: boolean) {
    const b = this.buffer;
    let x = 0;
    let i = 0;
    let m = 1;

    while (i < 8) {
      const v = b[i];

      x += v * m;
      m *= 256;
      i++;
    }

    if (!allowImprecise && x >= MAX_SAFE_INTEGER) {
      trace("Coercing out of range value %d to Infinity.", x);

      return Infinity;
    }

    return x;
  }

  valueOf() {
    return this.toNumber(false);
  }

  toArrayBuffer() {
    return this.buffer.buffer;
  }

  toDataView() {
    return new DataView(this.buffer.buffer);
  }

  toHexString(): string {
    let hex = "";

    for (let i = 7; i >= 0; i--) {
      let v = this.buffer[i].toString(16);

      if (v.length === 1) v = "0" + v;

      hex += v;
    }

    return hex;
  }

  toString(radix?: number) {
    return this.toNumber(true).toString(radix);
  }

  toUint8Array() {
    return this.buffer;
  }
}
