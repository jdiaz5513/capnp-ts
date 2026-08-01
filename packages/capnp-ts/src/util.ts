/**
 * @author jdiaz5513
 */

import initTrace from "debug";

import { MAX_BUFFER_DUMP_BYTES, MAX_INT32, MAX_UINT32 } from "./constants";
import { RANGE_INT32_OVERFLOW, RANGE_INVALID_UTF8, RANGE_UINT32_OVERFLOW } from "./errors";

const trace = initTrace("capnp:util");
trace("load");

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

  return `[${h.join(" ")}]`;
}

const BASE64_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
const BASE64_CODES = new Int8Array(128).fill(-1);
for (let i = 0; i < BASE64_CHARS.length; i++) BASE64_CODES[BASE64_CHARS.charCodeAt(i)] = i;
BASE64_CODES["=".charCodeAt(0)] = 0;

interface NodeBufferCtor {
  from(input: string, encoding: "base64"): Uint8Array;
  from(input: ArrayBufferLike, byteOffset: number, length: number): { toString(encoding: "base64"): string };
}

const NATIVE_BUFFER = (globalThis as { Buffer?: NodeBufferCtor }).Buffer;
const NATIVE_TO_BASE64 = typeof (Uint8Array.prototype as unknown as { toBase64?: unknown }).toBase64 === "function";
const NATIVE_U8 = Uint8Array as unknown as { fromBase64?: (value: string) => Uint8Array };

/**
 * Decode a base64 string into bytes.
 *
 * Delegates to Uint8Array.fromBase64, Buffer.from, or a JS fallback if neither is available.
 *
 * @export
 * @param {string} value The base64 string.
 * @returns {Uint8Array} The decoded bytes.
 */

export function base64ToBytes(value: string): Uint8Array {
  if (NATIVE_U8.fromBase64) return NATIVE_U8.fromBase64(value);
  if (NATIVE_BUFFER) return NATIVE_BUFFER.from(value, "base64");

  return base64ToBytesFallback(value);
}

/**
 * Decode a base64 string into bytes without native codecs.
 *
 * @export
 * @param {string} value The base64 string.
 * @returns {Uint8Array} The decoded bytes.
 */

export function base64ToBytesFallback(value: string): Uint8Array {
  let padding = 0;
  while (padding < 2 && value.length > 0 && value[value.length - 1 - padding] === "=") padding++;
  const out = new Uint8Array(((value.length / 4) * 3 - padding) | 0);
  let o = 0;

  for (let i = 0; i < value.length; i += 4) {
    const n =
      (BASE64_CODES[value.charCodeAt(i)] << 18) |
      (BASE64_CODES[value.charCodeAt(i + 1)] << 12) |
      (BASE64_CODES[value.charCodeAt(i + 2)] << 6) |
      BASE64_CODES[value.charCodeAt(i + 3)];

    if (o < out.length) out[o++] = (n >> 16) & 0xff;
    if (o < out.length) out[o++] = (n >> 8) & 0xff;
    if (o < out.length) out[o++] = n & 0xff;
  }

  return out;
}

/**
 * Encode bytes as a base64 string. Delegates to a native codec where one exists.
 *
 * @export
 * @param {Uint8Array} bytes The bytes to encode.
 * @returns {string} The base64 string.
 */

export function bytesToBase64(bytes: Uint8Array): string {
  if (NATIVE_TO_BASE64) return (bytes as unknown as { toBase64(): string }).toBase64();
  if (NATIVE_BUFFER) return NATIVE_BUFFER.from(bytes.buffer, bytes.byteOffset, bytes.byteLength).toString("base64");

  return bytesToBase64Fallback(bytes);
}

/**
 * Encode bytes as a base64 string without native codecs.
 *
 * @export
 * @param {Uint8Array} bytes The bytes to encode.
 * @returns {string} The base64 string.
 */

export function bytesToBase64Fallback(bytes: Uint8Array): string {
  let out = "";

  for (let i = 0; i < bytes.length; i += 3) {
    const remaining = bytes.length - i;
    const n = (bytes[i] << 16) | ((remaining > 1 ? bytes[i + 1] : 0) << 8) | (remaining > 2 ? bytes[i + 2] : 0);

    out += BASE64_CHARS[(n >> 18) & 0x3f];
    out += BASE64_CHARS[(n >> 12) & 0x3f];
    out += remaining > 1 ? BASE64_CHARS[(n >> 6) & 0x3f] : "=";
    out += remaining > 2 ? BASE64_CHARS[n & 0x3f] : "=";
  }

  return out;
}

/**
 * Throw an error if the provided value cannot be represented as a 32-bit integer.
 *
 * @export
 * @param {number} value The number to check.
 * @returns {number} The same number if it is valid.
 */

export function checkInt32(value: number): number {
  if (value > MAX_INT32 || value < -MAX_INT32) {
    throw new RangeError(RANGE_INT32_OVERFLOW);
  }

  return value;
}

export function checkUint32(value: number): number {
  if (value < 0 || value > MAX_UINT32) {
    throw new RangeError(RANGE_UINT32_OVERFLOW);
  }

  return value;
}

/**
 * Decode a UTF-8 encoded byte array into a JavaScript string (UCS-2).
 *
 * @export
 * @param {Uint8Array} src A utf-8 encoded byte array.
 * @returns {string} A string representation of the byte array.
 */

export function decodeUtf8(src: Uint8Array): string {
  // This ain't for the faint of heart, kids. If you suffer from seizures, heart palpitations, or have had a history of
  // stroke you may want to look away now.

  const l = src.byteLength;
  let dst = "";
  let i = 0;
  let cp = 0;
  let a = 0;
  let b = 0;
  let c = 0;
  let d = 0;

  while (i < l) {
    a = src[i++];

    if ((a & 0b10000000) === 0) {
      cp = a;
    } else if ((a & 0b11100000) === 0b11000000) {
      if (i >= l) throw new RangeError(RANGE_INVALID_UTF8);

      b = src[i++];

      cp = ((a & 0b00011111) << 6) | (b & 0b00111111);
    } else if ((a & 0b11110000) === 0b11100000) {
      if (i + 1 >= l) throw new RangeError(RANGE_INVALID_UTF8);

      b = src[i++];
      c = src[i++];

      cp = ((a & 0b00001111) << 12) | ((b & 0b00111111) << 6) | (c & 0b00111111);
    } else if ((a & 0b11111000) === 0b11110000) {
      if (i + 2 >= l) throw new RangeError(RANGE_INVALID_UTF8);

      b = src[i++];
      c = src[i++];
      d = src[i++];

      cp = ((a & 0b00000111) << 18) | ((b & 0b00111111) << 12) | ((c & 0b00111111) << 6) | (d & 0b00111111);
    } else {
      throw new RangeError(RANGE_INVALID_UTF8);
    }

    if (cp <= 0xd7ff || (cp >= 0xe000 && cp <= 0xffff)) {
      dst += String.fromCharCode(cp);
    } else {
      // We must reach into the astral plane and construct the surrogate pair!

      cp -= 0x00010000;

      const hi = (cp >>> 10) + 0xd800;
      const lo = (cp & 0x03ff) + 0xdc00;

      if (hi < 0xd800 || hi > 0xdbff) throw new RangeError(RANGE_INVALID_UTF8);

      dst += String.fromCharCode(hi, lo);
    }
  }

  return dst;
}

export function dumpBuffer(buffer: ArrayBuffer | ArrayBufferView): string {
  const b =
    buffer instanceof ArrayBuffer
      ? new Uint8Array(buffer)
      : new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);

  const byteLength = Math.min(b.byteLength, MAX_BUFFER_DUMP_BYTES);

  let r = format("\n=== buffer[%d] ===", byteLength);

  for (let j = 0; j < byteLength; j += 16) {
    r += `\n${pad(j.toString(16), 8)}: `;
    let s = "";
    let k;

    for (k = 0; k < 16 && j + k < b.byteLength; k++) {
      const v = b[j + k];

      r += `${pad(v.toString(16), 2)} `;

      // Printable ASCII range.

      s += v > 31 && v < 255 ? String.fromCharCode(v) : "·";

      if (k === 7) r += " ";
    }

    r += `${repeat((17 - k) * 3, " ")}${s}`;
  }

  r += "\n";

  if (byteLength !== b.byteLength) {
    r += format("=== (truncated %d bytes) ===\n", b.byteLength - byteLength);
  }

  return r;
}

/**
 * Encode a JavaScript string (UCS-2) to a UTF-8 encoded string inside a Uint8Array.
 *
 * Note that the underlying buffer for the array will likely be larger than the actual contents; ignore the extra bytes.
 *
 * @export
 * @param {string} src The input string.
 * @returns {Uint8Array} A UTF-8 encoded buffer with the string's contents.
 */

export function encodeUtf8(src: string): Uint8Array {
  const l = src.length;
  const dst = new Uint8Array(new ArrayBuffer(l * 4));
  let j = 0;

  for (let i = 0; i < l; i++) {
    const c = src.charCodeAt(i);

    if (c <= 0x7f) {
      dst[j++] = c;
    } else if (c <= 0x07ff) {
      dst[j++] = 0b11000000 | (c >>> 6);
      dst[j++] = 0b10000000 | ((c >>> 0) & 0b00111111);
    } else if (c <= 0xd7ff || c >= 0xe000) {
      dst[j++] = 0b11100000 | (c >>> 12);
      dst[j++] = 0b10000000 | ((c >>> 6) & 0b00111111);
      dst[j++] = 0b10000000 | ((c >>> 0) & 0b00111111);
    } else {
      // Make sure the surrogate pair is complete.
      /* istanbul ignore next */
      if (i + 1 >= l) throw new RangeError(RANGE_INVALID_UTF8);

      // I cast thee back into the astral plane.

      const hi = c - 0xd800;
      const lo = src.charCodeAt(++i) - 0xdc00;
      const cp = ((hi << 10) | lo) + 0x00010000;

      dst[j++] = 0b11110000 | (cp >>> 18);
      dst[j++] = 0b10000000 | ((cp >>> 12) & 0b00111111);
      dst[j++] = 0b10000000 | ((cp >>> 6) & 0b00111111);
      dst[j++] = 0b10000000 | ((cp >>> 0) & 0b00111111);
    }
  }

  return dst.subarray(0, j);
}

/**
 * Produce a `printf`-style string. Nice for providing arguments to `assert` without paying the cost for string
 * concatenation up front. Precision is supported for floating point numbers.
 *
 * @param {string} s The format string. Supported format specifiers: b, c, d, f, j, o, s, x, and X.
 * @param {...any} args Values to be formatted in the string. Arguments beyond what are consumed by the format string
 * are ignored.
 * @returns {string} The formatted string.
 */

export function format(s: string, ...args: unknown[]): string {
  const n = s.length;
  let arg: unknown;
  let argIndex = 0;
  let c: string;
  let escaped = false;
  let i = 0;
  let leadingZero = false;
  let precision: number | null;
  let result = "";

  function nextArg() {
    return args[argIndex++];
  }

  function slurpNumber() {
    let digits = "";

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

      if (c === ".") {
        leadingZero = false;

        c = s[++i];
      } else if (c === "0" && s[i + 1] === ".") {
        leadingZero = true;

        i += 2;
        c = s[i];
      } else {
        leadingZero = true;
      }

      precision = slurpNumber();

      switch (c) {
        case "a": // number in hex with padding
          result += "0x" + pad(parseInt(String(nextArg()), 10).toString(16), 8);

          break;

        case "b": // number in binary
          result += parseInt(String(nextArg()), 10).toString(2);

          break;

        case "c": // character
          arg = nextArg();

          if (typeof arg === "string" || arg instanceof String) {
            result += arg;
          } else {
            result += String.fromCharCode(parseInt(String(arg), 10));
          }

          break;

        case "d": // number in decimal
          result += parseInt(String(nextArg()), 10);

          break;

        case "f": {
          // floating point number
          const tmp = parseFloat(String(nextArg())).toFixed(precision || 6);

          result += leadingZero ? tmp : tmp.replace(/^0/, "");

          break;
        }
        case "j": // JSON
          result += JSON.stringify(nextArg());

          break;

        case "o": // number in octal
          result += "0" + parseInt(String(nextArg()), 10).toString(8);

          break;

        case "s": // string
          result += nextArg();

          break;

        case "x": // lowercase hexadecimal
          result += "0x" + parseInt(String(nextArg()), 10).toString(16);

          break;

        case "X": // uppercase hexadecimal
          result += "0x" + parseInt(String(nextArg()), 10).toString(16).toUpperCase();

          break;

        default:
          result += c;

          break;
      }
    } else if (c === "%") {
      escaped = true;
    } else {
      result += c;
    }
  }

  return result;
}

/**
 * Return the thing that was passed in. Yaaaaawn.
 *
 * @export
 * @template T
 * @param {T} x A thing.
 * @returns {T} The same thing.
 */

export function identity<T>(x: T): T {
  return x;
}

export function pad(v: string, width: number, pad = "0"): string {
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

export function repeat(times: number, str: string): string {
  let out = "";
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

const hex = (v: unknown) => parseInt(String(v)).toString(16);

// Set up custom debug formatters.

/* istanbul ignore next */
initTrace.formatters["h"] = hex;
/* istanbul ignore next */
initTrace.formatters["x"] = (v: unknown) => `0x${hex(v)}`;
/* istanbul ignore next */
initTrace.formatters["a"] = (v: unknown) => `0x${pad(hex(v), 8)}`;
/* istanbul ignore next */
initTrace.formatters["X"] = (v: unknown) => `0x${hex(v).toUpperCase()}`;
