/**
 * @author jdiaz5513
 */

// LINT: a lot of the util functions need the any type.
/* tslint:disable:no-any */

import initTrace from 'debug';
import {TextDecoder, TextEncoder} from 'utf8-encoding';
// LINT: this module doesn't export its typings correctly :(
/* tslint:disable-next-line:no-import-side-effect */
import './types/utf8-encoding';

import {MAX_INT32, MAX_SEGMENT_LENGTH, MAX_UINT32} from './constants';
import {RANGE_INT32_OVERFLOW, RANGE_SIZE_OVERFLOW, RANGE_UINT32_OVERFLOW} from './errors';

const trace = initTrace('capnp:util');
trace('load');

// Set up custom debug formatters.

/* tslint:disable:no-string-literal */
initTrace.formatters['h'] = (v: any) => v.toString('hex');
initTrace.formatters['x'] = (v: any) => `0x${v.toString(16)}`;
initTrace.formatters['a'] = (v: any) => `0x${pad(v.toString(16), 8)}`;
initTrace.formatters['X'] = (v: any) => `0x${v.toString(16).toUpperCase()}`;
/* tslint:enable:no-string-literal */

/**
 * Enables the mixin pattern on a class by allowing the class to implement multiple parent classes; call
 * `applyMixins()` on the subclass to add all of the prototype methods to it. Prototype methods with conflicting names
 * are overridden from left to right.
 *
 * @export
 * @param {*} derivedCtor The subclass to extend.
 * @param {any[]} baseCtors An array of parent classes to inherit from.
 * @returns {void}
 */

export function applyMixins(derivedCtor: any, baseCtors: any[]) {

  baseCtors.forEach((baseCtor) => {

    Object.getOwnPropertyNames(baseCtor.prototype).forEach((name) => {

      derivedCtor.prototype[name] = baseCtor.prototype[name];

    });

  });

}

/**
 * Dump a hex string from the given buffer.
 *
 * @export
 * @param {ArrayBuffer} buffer The buffer to convert.
 * @returns {string} A hexadecimal string representing the buffer.
 */

export function bufferToHex(buffer: ArrayBuffer): string {

  const a = new Uint8Array(buffer);
  const h = [];

  for (let i = 0; i < a.byteLength; i++) h.push(pad(a[i].toString(16), 2));

  return `[${h.join(' ')}]`;

}

/**
 * Throw an error if the provided value cannot be represented as a 32-bit integer.
 *
 * @export
 * @param {number} value The number to check.
 * @returns {number} The same number if it is valid.
 */

export function checkInt32(value: number): number {

  if (value > MAX_INT32 || value < -MAX_INT32) throw new RangeError(RANGE_INT32_OVERFLOW);

  return value;

}

export function checkUint32(value: number): number {

  if (value < 0 || value > MAX_UINT32) throw new RangeError(RANGE_UINT32_OVERFLOW);

  return value;

}

/**
 * Throw an error if the provided size (in bytes) is greater than the allowed limit, or return the same number
 * otherwise.
 *
 * @export
 * @param {number} size The size to check.
 * @returns {number} The same size, if it is valid.
 */

export function checkSizeOverflow(size: number): number {

  if (size > MAX_SEGMENT_LENGTH) throw new RangeError(format(RANGE_SIZE_OVERFLOW, size));

  return size;

}

const _decoder = new TextDecoder();
const _encoder = new TextEncoder();
export const decodeUtf8 = _decoder.decode.bind(_decoder);
export const encodeUtf8 = _encoder.encode.bind(_encoder);

/**
 * Produce a `printf`-style string. Nice for providing arguments to `assert` without paying the cost for string
 * concatenation up front. Precision is supported for floating point numbers.
 *
 * @param {string} s The format string. Supported format specifiers: b, c, d, f, j, o, s, x, and X.
 * @param {...any} args Values to be formatted in the string. Arguments beyond what are consumed by the format string
 * are ignored.
 * @returns {string} The formatted string.
 */

export function format(s: string, ...args: any[]) {

  const n = s.length;
  let arg: any;
  let argIndex = 0;
  let c: string;
  let escaped = false;
  let i = 0;
  let leadingZero = false;
  let precision: number | null;
  let result = '';

  function nextArg() {

    return args[argIndex++];

  }

  function slurpNumber() {

    let digits = '';

    while (/\d/.test(s[i])) {

      digits += s[i++];
      c = s[i];

    }

    return digits.length > 0 ? parseInt(digits, 10) : null;

  }

  for (; i < n; ++i) {

    c = s[i];

    if (escaped) {

      escaped = false;

      if (c === '.') {

        leadingZero = false;

        c = s[++i];

      } else if (c === '0' && s[i + 1] === '.') {

        leadingZero = true;

        i += 2;
        c = s[i];

      } else {

        leadingZero = true;

      }

      precision = slurpNumber();

      switch (c) {

        case 'a':   // number in hex with padding

          result += '0x' + pad(parseInt(nextArg(), 10).toString(16), 8);

          break;

        case 'b':   // number in binary

          result += parseInt(nextArg(), 10).toString(2);

          break;

        case 'c':   // character

          arg = nextArg();

          if (typeof arg === 'string' || arg instanceof String) {

            result += arg;
          } else {

            result += String.fromCharCode(parseInt(arg, 10));

          }

          break;

        case 'd':   // number in decimal

          result += parseInt(nextArg(), 10);

          break;

        case 'f':   // floating point number

          const tmp = String(parseFloat(nextArg()).toFixed(precision || 6));

          result += leadingZero ? tmp : tmp.replace(/^0/, '');

          break;

        case 'j':   // JSON

          result += JSON.stringify(nextArg());

          break;

        case 'o':   // number in octal

          result += '0' + parseInt(nextArg(), 10).toString(8);

          break;

        case 's':   // string

          result += nextArg();

          break;

        case 'x':   // lowercase hexadecimal

          result += '0x' + parseInt(nextArg(), 10).toString(16);

          break;

        case 'X':   // uppercase hexadecimal

          result += '0x' + parseInt(nextArg(), 10).toString(16).toUpperCase();

          break;

        default:

          result += c;

          break;

      }

    } else if (c === '%') {

      escaped = true;

    } else {

      result += c;

    }

  }

  return result;

}

/**
 * Return a new DataView backed by the same ArrayBuffer but with a new byteOffset and byteLength. Will throw if the new
 * DataView extends outside the ArrayBuffer bounds.
 *
 * @param {DataView} dataView The DataView to extend.
 * @param {number | undefined} relByteOffset The new byteOffset relative to the current one.
 * @param {number | undefined} byteLength THe new byteLength, or `undefined` to use the same length.
 * @returns {DataView} The new DataView.
 */

export function extendDataView(dataView: DataView, relByteOffset = 0, byteLength?: number) {

  // The DataView constructor does bounds checking for us. :)

  return new DataView(dataView.buffer, dataView.byteOffset + relByteOffset, byteLength || dataView.byteLength);

}

/**
 * Compute the Hamming weight (number of bits set) of a number. Useful for dealing with tag bytes in the packing
 * algorithm. Using this with floating point numbers will void your warranty.
 *
 * @param {number} x A real integer.
 * @returns {number} The hamming weight (integer).
 */

export function getHammingWeight(x: number) {

  // Thanks, HACKMEM!

  let w = x - ((x >> 1) & 0x55555555);
  w = (w & 0x33333333) + ((w >> 2) & 0x33333333);
  return ((w + (w >> 4) & 0x0f0f0f0f) * 0x01010101) >> 24;

}

/**
 * Return the thing that was passed in. Yaaaaawn.
 *
 * @export
 * @template T
 * @param {T} x A thing.
 * @returns {T} The same thing.
 */

export function identity<T>(x: T) {

  return x;

}

/**
 * Copy `n` bytes from the `src` DataView to `dst`.
 *
 * @param {DataView} dst The destination DataView.
 * @param {DataView} src The source DataView.
 * @param {number | undefined} n Number of bytes to copy. If undefined, will copy all of `src`.
 * @returns {void}
 */

export function memcpy(dst: DataView, src: DataView, n?: number): void {

  trace('Copying %d bytes from %s to %s.', n, src, dst);

  // Use Int32Arrays to copy from one ArrayBuffer to the other (so far appears to be the fastest way).

  const d = new Int32Array(dst.buffer, dst.byteOffset, dst.byteLength);
  const s = new Int32Array(src.buffer, src.byteOffset, n || src.byteLength);

  d.set(s);

}

export function noop(): void {

  // do nothing!

}

export function pad(v: string, width: number, pad = '0'): string {

  return v.length >= width ? v : new Array(width - v.length + 1).join(pad) + v;

}

/**
 * Add padding to a number to make it divisible by 8. Typically used to pad byte sizes so they align to a word boundary.
 *
 * @export
 * @param {number} size The number to pad.
 * @returns {number} The padded number.
 */

export function padToWord(size: number): number {

  return (size + 7) & ~7;

}

/**
 * Repeat a string n times. Shamelessly copied from lodash.repeat.
 *
 * @param {number} times Number of times to repeat.
 * @param {string} str The string to repeat.
 * @returns {string} The repeated string.
 */

export function repeat(times: number, str: string) {

  let out = '';
  let n = times;
  let s = str;

  if (n < 1 || n > Number.MAX_VALUE) return out;

  // https://en.wikipedia.org/wiki/Exponentiation_by_squaring

  do {

    if (n % 2) out += s;

    n = Math.floor(n / 2);

    if (n) s += s;

  } while (n);

  return out;

}
