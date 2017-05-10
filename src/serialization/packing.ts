/**
 * @author jdiaz5513
 */

import {PACK_SPAN_THRESHOLD} from '../constants';
import {MSG_PACK_NOT_WORD_ALIGNED} from '../errors';

/**
 * When packing a message there are two tags that are interpreted in a special way: `0x00` and `0xff`.
 *
 * @enum {number}
 */

const enum PackedTag {

  /**
   * The tag is followed by a single byte which indicates a count of consecutive zero-valued words, minus 1. E.g. if the
   * tag 0x00 is followed by 0x05, the sequence unpacks to 6 words of zero.
   *
   * Or, put another way: the tag is first decoded as if it were not special. Since none of the bits are set, it is
   * followed by no bytes and expands to a word full of zeros. After that, the next byte is interpreted as a count of
   * additional words that are also all-zero.
   */

  ZERO = 0x00,

  /**
   * The tag is followed by the bytes of the word (as if it weren’t special), but after those bytes is another byte with
   * value N. Following that byte is N unpacked words that should be copied directly.
   *
   * These unpacked words may contain zeroes; in this implementation a minimum of PACK_SPAN_THRESHOLD zero bytes are
   * written before ending the span.
   *
   * The purpose of this rule is to minimize the impact of packing on data that doesn’t contain any zeros – in
   * particular, long text blobs. Because of this rule, the worst-case space overhead of packing is 2 bytes per 2 KiB of
   * input (256 words = 2KiB).
   */

  SPAN = 0xff,

}

/**
 * Compute the Hamming weight (number of bits set to 1) of a number. Used to figure out how many bytes follow a tag byte
 * while computing the size of a packed message.
 *
 * WARNING: Using this with floating point numbers will void your warranty.
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

export type byte = number;

/**
 * Compute the tag byte from the 8 bytes of a 64-bit word.
 *
 * @param {byte} a The first byte.
 * @param {byte} b The second byte.
 * @param {byte} c The third byte.
 * @param {byte} d The fourth byte.
 * @param {byte} e The fifth byte.
 * @param {byte} f The sixth byte.
 * @param {byte} g The seventh byte.
 * @param {byte} h The eighth byte (phew!).
 * @returns {number} The tag byte.
 */

export function getTagByte(a: byte, b: byte, c: byte, d: byte, e: byte, f: byte, g: byte, h: byte): number {

  // Yes, it's pretty. Don't touch it.

  return (a === 0 ? 0 : 0b00000001) |
         (b === 0 ? 0 : 0b00000010) |
         (c === 0 ? 0 : 0b00000100) |
         (d === 0 ? 0 : 0b00001000) |
         (e === 0 ? 0 : 0b00010000) |
         (f === 0 ? 0 : 0b00100000) |
         (g === 0 ? 0 : 0b01000000) |
         (h === 0 ? 0 : 0b10000000) ;

}

/**
 * Compute the number of zero bytes that occur in a given 64-bit word, provided as eight separate bytes.
 *
 * @param {byte} a The first byte.
 * @param {byte} b The second byte.
 * @param {byte} c The third byte.
 * @param {byte} d The fourth byte.
 * @param {byte} e The fifth byte.
 * @param {byte} f The sixth byte.
 * @param {byte} g The seventh byte.
 * @param {byte} h The eighth byte (phew!).
 * @returns {number} The number of these bytes that are zero.
 */

export function getZeroByteCount(a: byte, b: byte, c: byte, d: byte, e: byte, f: byte, g: byte, h: byte): number {

  return (a === 0 ? 1 : 0) +
         (b === 0 ? 1 : 0) +
         (c === 0 ? 1 : 0) +
         (d === 0 ? 1 : 0) +
         (e === 0 ? 1 : 0) +
         (f === 0 ? 1 : 0) +
         (g === 0 ? 1 : 0) +
         (h === 0 ? 1 : 0) ;

}

/**
 * Efficiently calculate the length of a packed Cap'n Proto message.
 *
 * @export
 * @param {ArrayBuffer} packed The packed message.
 * @returns {number} The length of the unpacked message in bytes.
 */

export function getUnpackedByteLength(packed: ArrayBuffer): number {

  const p = new Uint8Array(packed);
  let wordLength = 0;
  let lastTag = 0x77;

  for (let i = 0; i < p.byteLength;) {

    const tag = p[i];

    if (lastTag === PackedTag.ZERO) {

      wordLength += tag;

      i++;

      lastTag = 0x77;

    } else if (lastTag === PackedTag.SPAN) {

      wordLength += tag;

      i += tag * 8 + 1;

      lastTag = 0x77;

    } else {

      wordLength++;

      i += getHammingWeight(tag) + 1;

      lastTag = tag;

    }


  }

  return wordLength * 8;

}

/**
 * Pack a Cap'n Proto message into a compressed format. This will efficiently compress zero bytes (which are common in
 * idiomatic Cap'n Proto messages) into a compact form.
 *
 * The returned array buffer is trimmed to the exact size of the packed message with a single copy operation at the end.
 * This should be decent on CPU time but does require quite a lot of memory (a normal array is filled up with each
 * packed byte until the packing is complete).
 *
 * @export
 * @param {ArrayBuffer} unpacked The message to pack.
 * @returns {ArrayBuffer} A packed version of the message.
 */

export function pack(unpacked: ArrayBuffer): ArrayBuffer {

  if (unpacked.byteLength % 8 !== 0) throw new Error(MSG_PACK_NOT_WORD_ALIGNED);

  const src = new Uint8Array(unpacked);

  // TODO: Maybe we should do this with buffers? This costs more than 8x the final compressed size in temporary RAM.

  const dst: number[] = [];

  /* Just have to be sure it's neither ZERO nor SPAN. */

  let lastTag = 0x77;

  /** This is where we need to remember to write the SPAN tag (0xff). */

  let spanTagOffset = NaN;

  /** How many words have been copied during the current span. */

  let spanWordLength = 0;

  /**
   * When this hits zero, we've had PACK_SPAN_THRESHOLD zero bytes pass by and it's time to bail from the span.
   */

  let spanThreshold = PACK_SPAN_THRESHOLD;

  for (let srcByteOffset = 0; srcByteOffset < src.byteLength; srcByteOffset += 8) {

    /** Read in the entire word. Yes, this feels silly but it's fast! */

    const a = src[srcByteOffset];
    const b = src[srcByteOffset + 1];
    const c = src[srcByteOffset + 2];
    const d = src[srcByteOffset + 3];
    const e = src[srcByteOffset + 4];
    const f = src[srcByteOffset + 5];
    const g = src[srcByteOffset + 6];
    const h = src[srcByteOffset + 7];

    const tag = getTagByte(a, b, c, d, e, f, g, h);

    /** If this is true we'll skip the normal word write logic after the switch statement. */

    let skipWriteWord = true;

    switch (lastTag) {

      case PackedTag.ZERO:

        // We're writing a span of words with all zeroes in them. See if we need to bail out of the fast path.

        if (tag !== PackedTag.ZERO || spanWordLength >= 0xff) {

          // There's a bit in there or we got too many zeroes. Damn, we need to bail.

          dst.push(spanWordLength);
          spanWordLength = 0;

          skipWriteWord = false;

        } else {

          // Kay, let's quickly inc this and go.

          spanWordLength++;

        }

        break;

      case PackedTag.SPAN:

        // We're writing a span of nonzero words.

        const zeroCount = getZeroByteCount(a, b, c, d, e, f, g, h);

        // See if we need to bail now.

        if (spanThreshold <= 0 || spanWordLength >= 0xff) {

          // Alright, time to get packing again. Write the number of words we skipped to the beginning of the span.

          dst[spanTagOffset] = spanWordLength;
          spanWordLength = 0;

          spanThreshold = PACK_SPAN_THRESHOLD;

          // We have to write this word normally.

          skipWriteWord = false;

        } else {

          // Just write this word verbatim.

          dst.push(a, b, c, d, e, f, g, h);

          spanWordLength++;

          spanThreshold -= zeroCount;

        }

        break;

      default:

        // Didn't get a special tag last time, let's write this as normal.

        skipWriteWord = false;

        break;

    }

    // A goto is fast, idk why people keep hatin'.
    if (skipWriteWord) continue;

    dst.push(tag);
    lastTag = tag;

    if (a !== 0) dst.push(a);
    if (b !== 0) dst.push(b);
    if (c !== 0) dst.push(c);
    if (d !== 0) dst.push(d);
    if (e !== 0) dst.push(e);
    if (f !== 0) dst.push(f);
    if (g !== 0) dst.push(g);
    if (h !== 0) dst.push(h);

    // Record the span tag offset if needed, making sure to actually leave room for it.

    if (tag === PackedTag.SPAN) {

      spanTagOffset = dst.length;

      dst.push(0);

    }

  }

  return new Uint8Array(dst).buffer;

}

/**
 * Unpack a compressed Cap'n Proto message into a new ArrayBuffer.
 *
 * Unlike the `pack` function, this is able to efficiently determine the exact size needed for the output buffer and
 * runs considerably more efficiently.
 *
 * @export
 * @param {ArrayBuffer} packed An array buffer containing the packed message.
 * @returns {ArrayBuffer} The unpacked message.
 */

export function unpack(packed: ArrayBuffer): ArrayBuffer {

  // We have no choice but to read the packed buffer one byte at a time.

  const src = new Uint8Array(packed);
  const dst = new Uint8Array(new ArrayBuffer(getUnpackedByteLength(packed)));

  /** The last tag byte that we've seen - it starts at a "neutral" value. */

  let lastTag = 0x77;

  for (let srcByteOffset = 0, dstByteOffset = 0; srcByteOffset < src.byteLength;) {

    const tag = src[srcByteOffset];

    if (lastTag === PackedTag.ZERO) {

      // We have a span of zeroes. New array buffers are guaranteed to be initialized to zero so we just seek ahead.

      dstByteOffset += tag * 8;

      srcByteOffset++;

      lastTag = 0x77;

    } else if (lastTag === PackedTag.SPAN) {

      // We have a span of unpacked bytes. Copy them verbatim from the source buffer.

      const spanByteLength = tag * 8;

      dst.set(src.subarray(srcByteOffset + 1, srcByteOffset + 1 + spanByteLength), dstByteOffset);

      dstByteOffset += spanByteLength;
      srcByteOffset += 1 + spanByteLength;

      lastTag = 0x77;

    } else {

      // Okay, a normal tag. Let's read past the tag and copy bytes that have a bit set in the tag.

      srcByteOffset++;

      for (let i = 1; i <= 0b10000000; i <<= 1) {

        // We only need to actually touch `dst` if there's a nonzero byte (it's already initialized to zeroes).

        if ((tag & i) !== 0) dst[dstByteOffset] = src[srcByteOffset++];

        dstByteOffset++;

      }

      lastTag = tag;

    }

  }

  return dst.buffer;

}
