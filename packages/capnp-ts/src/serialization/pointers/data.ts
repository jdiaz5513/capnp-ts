/**
 * @author jdiaz5513
 */

import initTrace from "debug";

import { ListElementSize } from "../list-element-size";
import { List } from "./list";
import { Pointer, validate, getContent } from "./pointer";
import { PointerType } from "./pointer-type";

const trace = initTrace("capnp:data");
trace("load");

/**
 * A generic blob of bytes. Can be converted to a DataView or Uint8Array to access its contents using `toDataView()` and
 * `toUint8Array()`. Use `copyBuffer()` to copy an entire buffer at once.
 *
 * @export
 * @class Data
 * @extends {List<number>}
 */

export class Data extends List<number> {
  static fromPointer(pointer: Pointer): Data {
    validate(PointerType.LIST, pointer, ListElementSize.BYTE);

    return this._fromPointerUnchecked(pointer);
  }

  protected static _fromPointerUnchecked(pointer: Pointer): Data {
    return new this(
      pointer.segment,
      pointer.byteOffset,
      pointer._capnp.depthLimit
    );
  }

  /**
   * Copy the contents of `src` into this Data pointer. If `src` is smaller than the length of this pointer then the
   * remaining bytes will be zeroed out. Extra bytes in `src` are ignored.
   *
   * @param {(ArrayBuffer | ArrayBufferView)} src The source buffer.
   * @returns {void}
   */

  // TODO: Would be nice to have a way to zero-copy a buffer by allocating a new segment into the message with that
  // buffer data.

  copyBuffer(src: ArrayBuffer | ArrayBufferView): void {
    const c = getContent(this);

    const dstLength = this.getLength();
    const srcLength = src.byteLength;

    const i =
      src instanceof ArrayBuffer
        ? new Uint8Array(src)
        : new Uint8Array(
            src.buffer,
            src.byteOffset,
            Math.min(dstLength, srcLength)
          );

    const o = new Uint8Array(c.segment.buffer, c.byteOffset, this.getLength());

    o.set(i);

    if (dstLength > srcLength) {
      trace(
        "Zeroing out remaining %d bytes after copy into %s.",
        dstLength - srcLength,
        this
      );

      o.fill(0, srcLength, dstLength);
    } else if (dstLength < srcLength) {
      trace(
        "Truncated %d bytes from source buffer while copying to %s.",
        srcLength - dstLength,
        this
      );
    }
  }

  /**
   * Read a byte from the specified offset.
   *
   * @param {number} byteOffset The byte offset to read.
   * @returns {number} The byte value.
   */

  get(byteOffset: number): number {
    const c = getContent(this);
    return c.segment.getUint8(c.byteOffset + byteOffset);
  }

  /**
   * Write a byte at the specified offset.
   *
   * @param {number} byteOffset The byte offset to set.
   * @param {number} value The byte value to set.
   * @returns {void}
   */

  set(byteOffset: number, value: number): void {
    const c = getContent(this);
    c.segment.setUint8(c.byteOffset + byteOffset, value);
  }

  /**
   * Creates a **copy** of the underlying buffer data and returns it as an ArrayBuffer.
   *
   * To obtain a reference to the underlying buffer instead, use `toUint8Array()` or `toDataView()`.
   *
   * @returns {ArrayBuffer} A copy of this data buffer.
   */

  toArrayBuffer(): ArrayBuffer {
    const c = getContent(this);
    return c.segment.buffer.slice(
      c.byteOffset,
      c.byteOffset + this.getLength()
    );
  }

  /**
   * Convert this Data pointer to a DataView representing the pointer's contents.
   *
   * WARNING: The DataView references memory from a message segment, so do not venture outside the bounds of the
   * DataView or else BAD THINGS.
   *
   * @returns {DataView} A live reference to the underlying buffer.
   */

  toDataView(): DataView {
    const c = getContent(this);
    return new DataView(c.segment.buffer, c.byteOffset, this.getLength());
  }

  toString(): string {
    return `Data_${super.toString()}`;
  }

  /**
   * Convert this Data pointer to a Uint8Array representing the pointer's contents.
   *
   * WARNING: The Uint8Array references memory from a message segment, so do not venture outside the bounds of the
   * Uint8Array or else BAD THINGS.
   *
   * @returns {DataView} A live reference to the underlying buffer.
   */

  toUint8Array(): Uint8Array {
    const c = getContent(this);
    return new Uint8Array(c.segment.buffer, c.byteOffset, this.getLength());
  }
}
