/**
 * @author jdiaz5513
 */

import initTrace from 'debug';

import {decodeUtf8, encodeUtf8} from '../../util';
import {ListElementSize} from '../list-element-size';
import {List} from './list';
import {Pointer} from './pointer';
import {PointerType} from './pointer-type';

const trace = initTrace('capnp:text');
trace('load');

export class Text extends List<string> {

  static fromPointer(pointer: Pointer): Text {

    pointer._validate(PointerType.LIST, ListElementSize.BYTE);

    return this._fromPointerUnchecked(pointer);

  }

  protected static _fromPointerUnchecked(pointer: Pointer): Text {

    return new this(pointer.segment, pointer.byteOffset, pointer._depthLimit);

  }

  /**
   * Read a utf-8 encoded string value from this pointer.
   *
   * @param {number} [index] The index at which to start reading; defaults to zero.
   * @returns {string} The string value.
   */

  get(index = 0): string {

    if (index !== 0) trace('Called get() on %s with a strange index (%d).', this, index);

    const c = this._getContent();

    // Remember to exclude the NUL byte.

    return decodeUtf8(new Uint8Array(c.segment.buffer, c.byteOffset + index, this.getLength() - index));

  }

  /**
   * Get the number of utf-8 encoded bytes in this text. This does **not** include the NUL byte.
   *
   * @returns {number} The number of bytes allocated for the text.
   */

  getLength(): number {

    return super.getLength() - 1;

  }

  /**
   * Write a utf-8 encoded string value starting at the specified index.
   *
   * @param {number} index The index at which to start copying the string. Note that if this is not zero the bytes
   * before `index` will be left as-is. All bytes after `index` will be overwritten.
   * @param {string} value The string value to set.
   * @returns {void}
   */

  set(index: number, value: string): void {

    if (index !== 0) trace('Called set() on %s with a strange index (%d).', this, index);

    const src = encodeUtf8(value);
    const dstLength = src.byteLength + index;
    let c: Pointer;
    let original: Uint8Array|undefined;

    // TODO: Consider reusing existing space if list is already initialized and there's enough room for the value.

    if (!this._isNull()) {

      c = this._getContent();

      // Only copy bytes that will remain after copying. Everything after `index` should end up truncated.

      let originalLength = this.getLength();

      if (originalLength >= index) {

        originalLength = index;

      } else {

        trace('%d byte gap exists between original text and new text in %s.', index - originalLength, this);

      }

      original = new Uint8Array(c.segment.buffer.slice(c.byteOffset, c.byteOffset + Math.min(originalLength, index)));

      this._erase();

    }

    // Always allocate an extra byte for the NUL byte.

    this._initList(ListElementSize.BYTE, dstLength + 1);

    c = this._getContent();
    const dst = new Uint8Array(c.segment.buffer, c.byteOffset, dstLength);

    if (original) dst.set(original);

    dst.set(src, index);

  }

  toString(): string {

    return `Text_${super.toString()}`;

  }

}
