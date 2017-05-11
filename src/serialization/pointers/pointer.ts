/**
 * @author jdiaz5513
 */

import initTrace from 'debug';

import {LIST_SIZE_MASK, MAX_DEPTH, POINTER_DOUBLE_FAR_MASK, POINTER_TYPE_MASK} from '../../constants';
import {
  INVARIANT_UNREACHABLE_CODE,
  PTR_DEPTH_LIMIT_EXCEEDED,
  PTR_INVALID_FAR_TARGET,
  PTR_INVALID_LIST_SIZE,
  PTR_INVALID_POINTER_TYPE,
  PTR_OFFSET_OUT_OF_BOUNDS,
  PTR_WRONG_COMPOSITE_DATA_SIZE,
  PTR_WRONG_COMPOSITE_PTR_SIZE,
  PTR_WRONG_LIST_TYPE,
  PTR_WRONG_POINTER_TYPE,
  PTR_WRONG_STRUCT_DATA_SIZE,
  PTR_WRONG_STRUCT_PTR_SIZE,
  TYPE_COMPOSITE_SIZE_UNDEFINED,
} from '../../errors';
import {bufferToHex, format} from '../../util';
import {ListElementSize} from '../list-element-size';
import {ObjectSize} from '../object-size';
import {Segment} from '../segment';
import {PointerAllocationResult} from './pointer-allocation-result';
import {PointerType} from './pointer-type';

const trace = initTrace('capnp:pointer');
trace('load');

/**
 * A pointer referencing a single byte location in a segment. This is typically used for Cap'n Proto pointers, but is
 * also sometimes used to reference an offset to a pointer's content or tag words.
 *
 * @export
 * @class Pointer
 */

export class Pointer {

  /**
   * A number that is decremented as nested pointers are traversed. When this hits zero errors will be thrown.
   *
   * @internal
   */

  _depthLimit: number;

  /** Offset, in bytes, from the start of the segment to the beginning of this pointer. */

  byteOffset: number;

  /**
   * The starting segment for this pointer's data. In the case of a far pointer, the actual content this pointer is
   * referencing will be in another segment within the same message.
   */

  segment: Segment;

  constructor(segment: Segment, byteOffset: number, depthLimit = MAX_DEPTH) {

    if (depthLimit === 0) throw new Error(format(PTR_DEPTH_LIMIT_EXCEEDED, this));

    if (byteOffset < 0 || byteOffset > segment.byteOffset - 8) {

      throw new Error(format(PTR_OFFSET_OUT_OF_BOUNDS, byteOffset));

    }

    this.segment = segment;
    this.byteOffset = byteOffset;
    this._depthLimit = depthLimit;

  }

  /**
   * Get the number of bytes required to hold a list element of the provided size. `COMPOSITE` elements do not have a
   * fixed size, and `BIT` elements are packed into exactly a single bit, so these both return `NaN`.
   *
   * @internal
   * @param {ListElementSize} elementSize A number describing the size of the list elements.
   * @returns {number} The number of bytes required to hold an element of that size, or `NaN` if that is undefined.
   */

  static _getListElementByteLength(elementSize: ListElementSize): number {

    switch (elementSize) {

      case ListElementSize.BIT:

        return NaN;

      case ListElementSize.BYTE:

        return 1;

      case ListElementSize.BYTE_2:

        return 2;

      case ListElementSize.BYTE_4:

        return 4;

      case ListElementSize.BYTE_8:
      case ListElementSize.POINTER:

        return 8;

      case ListElementSize.COMPOSITE:

        // Caller has to figure it out based on the tag word.

        return NaN;

      case ListElementSize.VOID:

        return 0;

      default:

        throw new Error(format(PTR_INVALID_LIST_SIZE, elementSize));

    }

  }

  /**
   * Add an offset to this pointer's offset and return a new Pointer for that address.
   *
   * @internal
   * @param {number} offset The number of bytes to add to this pointer's offset.
   * @returns {Pointer} A new pointer to the address.
   */

  _add(offset: number): Pointer {

    return new Pointer(this.segment, this.byteOffset + offset, this._depthLimit);

  }

  /**
   * Recursively erase this pointer, any far pointers/landing pads/tag words, and the content it points to.
   *
   * Note that this will leave "holes" of zeroes in the message, since the space cannot be reclaimed. With packing this
   * will have a negligible effect on the final message size.
   *
   * FIXME: This may need protection against infinite recursion...
   *
   * @returns {void}
   */

  _erase(): void {

    // First deal with the contents.

    let c: Pointer;

    switch (this._getTargetPointerType()) {

      case PointerType.STRUCT:

        const size = this._getTargetStructSize();
        c = this._getContent();

        // Wipe the data section.

        c.segment.fillZeroWords(c.byteOffset, size.dataByteLength / 8);

        // Iterate over all the pointers and nuke them.

        for (let i = 0; i < size.pointerLength; i++) {

          c._add(i * 8)._erase();

        }

        break;

      case PointerType.LIST:

        const elementSize = this._getTargetListElementSize();
        const length = this._getTargetListLength();
        let contentWords = length * Pointer._getListElementByteLength(elementSize) / 8;
        c = this._getContent();

        if (elementSize === ListElementSize.POINTER) {

          for (let i = 0; i < length; i++) {

            c._add(i * 8)._erase();

          }

          // Calling erase on each pointer takes care of the content, nothing left to do here.

          break;

        } else if (elementSize === ListElementSize.COMPOSITE) {

          // Read the total length from the tag word.
          contentWords = c._add(-8)._getOffsetWords();

          // Kill the tag word.
          c.segment.setWordZero(c.byteOffset - 8);

        }

        c.segment.fillZeroWords(c.byteOffset, contentWords);

        break;

      case PointerType.OTHER:

        // No content.

        break;

      default:

        throw new Error(format(PTR_INVALID_POINTER_TYPE, this._getTargetPointerType()));

    }

    if (this._getPointerType() === PointerType.FAR) {

      const landingPad = this._followFar();

      if (this._isDoubleFar()) {

        // Kill the double-far tag word.

        landingPad.segment.setWordZero(landingPad.byteOffset + 8);

      }

      // Kill the landing pad.

      landingPad.segment.setWordZero(landingPad.byteOffset);

    }

    // Finally! Kill the pointer itself...

    this.segment.setWordZero(this.byteOffset);

  }

  /**
   * Interpret the pointer as a far pointer, returning its target segment and offset.
   *
   * @internal
   * @returns {Pointer} A pointer to the far target.
   */

  _followFar(): Pointer {

    const targetSegment = this.segment.message.getSegment(this.segment.getUint32(this.byteOffset + 4));
    const targetOffset = this.segment.getUint32(this.byteOffset) >>> 3;

    return new Pointer(targetSegment, targetOffset, this._depthLimit - 1);

  }

  /**
   * If this address references a far pointer, follow it to the location where the actual pointer data is written.
   * Otherwise, returns this address unmodified.
   *
   * @internal
   * @returns {Pointer} The location of the actual pointer data.
   */

  _followFars(): Pointer {

    if (this._getPointerType() === PointerType.FAR) {

      const landingPad = this._followFar();

      if (this._isDoubleFar()) landingPad.byteOffset += 8;

      return landingPad;

    }

    return this;

  }

  /**
   * Obtain the location of this pointer's content, following far pointers as needed.
   *
   * @internal
   * @returns {Pointer} A pointer to the beginning of the pointer's content.
   */

  _getContent(): Pointer {

    if (this._isDoubleFar()) {

      const landingPad = this._followFar();
      const segmentId = landingPad._getFarSegmentId();

      return new Pointer(this.segment.message.getSegment(segmentId), landingPad._getOffsetWords() * 8);

    }

    const target = this._followFars();

    return new Pointer(target.segment, target.byteOffset + 8 + target._getOffsetWords() * 8);

  }

  /**
   * Read the target segment ID from a far pointer.
   *
   * @internal
   * @returns {number} The target segment ID.
   */

  _getFarSegmentId(): number {

    return this.segment.getUint32(this.byteOffset + 4);

  }

  /**
   * Get a number indicating the size of the list's elements.
   *
   * @internal
   * @returns {ListElementSize} The size of the list's elements.
   */

  _getListElementSize(): ListElementSize {

    return this.segment.getUint32(this.byteOffset + 4) & LIST_SIZE_MASK;

  }

  /**
   * Get the number of elements in this list pointer. For composite lists, this instead represents the total number of
   * words in the list (not counting the tag word).
   *
   * This method does **not** attempt to distinguish between composite and non-composite lists. To get the correct
   * length for composite lists use `_getTargetListLength()` instead.
   *
   * @internal
   * @returns {number} The length of the list, or total number of words for composite lists.
   */

  _getListLength(): number {

    return this.segment.getUint32(this.byteOffset + 4) >>> 3;

  }

  /**
   * Get the offset (in words) from the end of the pointer to the start of its content. For struct pointers, this is the
   * beginning of the data section, and for list pointers it is the location of the first element. The value should
   * always be zero for interface pointers.
   *
   * @internal
   * @returns {number} The offset, in words, from the end of the pointer to the start of the data section.
   */

  _getOffsetWords(): number {

    return this.segment.getInt32(this.byteOffset) >> 2;

  }

  /**
   * Look up the pointer type.
   *
   * @internal
   * @returns {PointerType} The type of pointer.
   */

  _getPointerType(): PointerType {

    return this.segment.getUint32(this.byteOffset) & POINTER_TYPE_MASK;

  }

  /**
   * Read the number of data words from this struct pointer.
   *
   * @internal
   * @returns {number} The number of data words in the struct.
   */

  _getStructDataWords(): number {

    return this.segment.getUint16(this.byteOffset + 4);

  }

  /**
   * Read the number of pointers contained in this struct pointer.
   *
   * @internal
   * @returns {number} The number of pointers in this struct.
   */

  _getStructPointerLength(): number {

    return this.segment.getUint16(this.byteOffset + 6);

  }

  /**
   * Get an object describing this struct pointer's size.
   *
   * @internal
   * @returns {ObjectSize} The size of the struct.
   */

  _getStructSize(): ObjectSize {

    return new ObjectSize(this._getStructDataWords() * 8, this._getStructPointerLength());

  }

  /**
   * Get a pointer to this pointer's composite list tag word, following far pointers as needed.
   *
   * @internal
   * @returns {Pointer} A pointer to the list's composite tag word.
   */

  _getTargetCompositeListTag(): Pointer {

    const c = this._getContent();

    // The composite list tag is always one word before the content.

    c.byteOffset -= 8;

    return c;

  }

  /**
   * Get the object size for the target composite list, following far pointers as needed.
   *
   * @internal
   * @returns {ObjectSize} An object describing the size of each struct in the list.
   */

  _getTargetCompositeListSize(): ObjectSize {

    return this._getTargetCompositeListTag()._getStructSize();

  }

  /**
   * Get the size of the list elements referenced by this pointer, following far pointers if necessary.
   *
   * @internal
   * @returns {ListElementSize} The size of the elements in the list.
   */

  _getTargetListElementSize(): ListElementSize {

    return this._followFars()._getListElementSize();

  }


  /**
   * Get the length of the list referenced by this pointer, following far pointers if necessary. If the list is a
   * composite list, it will look up the tag word and read the length from there.
   *
   * @internal
   * @returns {number} The number of elements in the list.
   */

  _getTargetListLength(): number {

    const p = this._followFars();

    if (p._getListElementSize() === ListElementSize.COMPOSITE) {

      // The content is prefixed by a tag word; it's a struct pointer whose offset contains the list's length.

      return this._getTargetCompositeListTag()._getOffsetWords();

    }

    return p._getListLength();

  }

  /**
   * Get the type of pointer referenced by this pointer, following far pointers if necessary. For non-far pointers this
   * is equivalent to calling `_getPointerType()`.
   *
   * The target of a far pointer can never be another far pointer, and this method will throw if such a situation is
   * encountered.
   *
   * @internal
   * @returns {PointerType} The type of pointer referenced by this pointer.
   */

  _getTargetPointerType(): PointerType {

    const t = this._followFars()._getPointerType();

    if (t === PointerType.FAR) throw new Error(format(PTR_INVALID_FAR_TARGET, this));

    return t;

  }

  /**
   * Get the size of the struct referenced by this pointer, following far pointers if necessary.
   *
   * @internal
   * @returns {ObjectSize} The size of the struct referenced by this pointer.
   */

  _getTargetStructSize(): ObjectSize {

    return this._followFars()._getStructSize();

  }

  /**
   * Check if the pointer is a double-far pointer.
   *
   * @internal
   * @returns {boolean} `true` if it is a double-far pointer, `false` otherwise.
   */

  _isDoubleFar(): boolean {

    return this._getPointerType() === PointerType.FAR &&
      (this.segment.getUint32(this.byteOffset) & POINTER_DOUBLE_FAR_MASK) !== 0;

  }

  /**
   * Quickly check to see if the pointer is "null". A "null" pointer is a zero word, equivalent to an empty struct
   * pointer.
   *
   * @internal
   * @returns {boolean} `true` if the pointer is "null".
   */

  _isNull(): boolean {

    return this.segment.isWordZero(this.byteOffset);

  }

  /**
   * Write a far pointer to this location.
   *
   * @internal
   * @param {boolean} doubleFar Set to `true` if this is a double far pointer.
   * @param {number} offsetWords The offset, in words, to the target pointer.
   * @param {number} segmentId The segment the target pointer is located in.
   * @returns {void}
   */

  _setFarPointer(doubleFar: boolean, offsetWords: number, segmentId: number): void {

    const A = PointerType.FAR;
    const B = doubleFar ? 1 : 0;
    const C = offsetWords;
    const D = segmentId;

    this.segment.setUint32(this.byteOffset, A | B << 2 | C << 3);
    this.segment.setUint32(this.byteOffset + 4, D);

  }

  /**
   * Write a raw interface pointer to this location.
   *
   * @internal
   * @param {number} capId The capability ID.
   * @returns {void}
   */

  _setInterfacePointer(capId: number): void {

    this.segment.setUint32(this.byteOffset, PointerType.OTHER);
    this.segment.setUint32(this.byteOffset + 4, capId);

  }

  /**
   * Write a raw list pointer to this location.
   *
   * @internal
   * @param {number} offsetWords The number of words from the end of this pointer to the beginning of the list content.
   * @param {ListElementSize} size The size of each element in the list.
   * @param {number} length The number of elements in the list.
   * @param {ObjectSize} [compositeSize] For composite lists this describes the size of each element in this list. This
   * is required for composite lists.
   * @returns {void}
   */

  _setListPointer(offsetWords: number, size: ListElementSize, length: number,
                            compositeSize?: ObjectSize): void {

    const A = PointerType.LIST;
    const B = offsetWords;
    const C = size;
    let D = length;

    if (size === ListElementSize.COMPOSITE) {

      if (compositeSize === undefined) throw new TypeError(TYPE_COMPOSITE_SIZE_UNDEFINED);

      D *= compositeSize.getWordLength();

    }

    this.segment.setUint32(this.byteOffset, A | B << 2);
    this.segment.setUint32(this.byteOffset + 4, C | D << 3);

  }

  /**
   * Write a raw struct pointer to this location.
   *
   * @internal
   * @param {number} offsetWords The number of words from the end of this pointer to the beginning of the struct's data
   * section.
   * @param {ObjectSize} size An object describing the size of the struct.
   * @returns {void}
   */

  _setStructPointer(offsetWords: number, size: ObjectSize): void {

    const A = PointerType.STRUCT;
    const B = offsetWords;
    const C = size.getDataWordLength();
    const D = size.pointerLength;

    this.segment.setUint32(this.byteOffset, A | B << 2);
    this.segment.setUint16(this.byteOffset + 4, C);
    this.segment.setUint16(this.byteOffset + 6, D);

  }

  /**
   * Read some bits off a list pointer to make sure it has the right pointer data.
   *
   * @param {PointerType} pointerType The expected pointer type.
   * @param {ListElementSize} [elementSize] For list pointers, the expected element size. Leave this
   * undefined for struct pointers.
   * @param {ObjectSize} [objectSize] For structs this is the expected size of the struct. For composite lists this is
   * the expected size of each struct in the list.
   * @returns {void}
   */

  _validate(pointerType: PointerType, elementSize?: ListElementSize, objectSize?: ObjectSize): void {

    if (this._isNull()) return;

    const p = this._followFars();

    // Check the pointer type.

    const A = p.segment.getUint32(p.byteOffset) & POINTER_TYPE_MASK;

    if (A !== pointerType) throw new Error(format(PTR_WRONG_POINTER_TYPE, this, pointerType));

    // Check the list element size, if provided.

    if (elementSize !== undefined) {

      const C = p.segment.getUint32(p.byteOffset + 4) & LIST_SIZE_MASK;

      if (C !== elementSize) throw new Error(format(PTR_WRONG_LIST_TYPE, this, elementSize));

    }

    // Check the object size, if provided.

    if (objectSize !== undefined) {

      objectSize = objectSize.padToWord();

      switch (pointerType) {

        case PointerType.STRUCT:

          const C = p.segment.getUint16(p.byteOffset + 4);
          const D = p.segment.getUint16(p.byteOffset + 6);

          const dataWordLength = objectSize.getDataWordLength();
          const pointerLength = objectSize.pointerLength;

          if (C !== dataWordLength) throw new Error(format(PTR_WRONG_STRUCT_DATA_SIZE, this, dataWordLength));

          if (D !== pointerLength) throw new Error(format(PTR_WRONG_STRUCT_PTR_SIZE, this, pointerLength));

          break;

        case PointerType.LIST:

          const actualSize = this._getTargetCompositeListSize();

          if (actualSize.dataByteLength !== objectSize.dataByteLength) {

            throw new Error(format(PTR_WRONG_COMPOSITE_DATA_SIZE, this, actualSize.dataByteLength));

          }

          if (actualSize.pointerLength !== objectSize.pointerLength) {

            throw new Error(format(PTR_WRONG_COMPOSITE_PTR_SIZE, this, actualSize.pointerLength));

          }

          break;

        default:

          throw new Error(PTR_INVALID_POINTER_TYPE);

      }

    }

  }

  dump() {

    return bufferToHex(this.segment.buffer.slice(this.byteOffset, this.byteOffset + 8));

  }

  toString(): string {

    return format('Pointer_%d@%a,%s,limit:%x', this.segment.id, this.byteOffset, this.dump(), this._depthLimit);

  }

  protected _initPointer(contentSegment: Segment, contentOffset: number): PointerAllocationResult {

    if (this.segment !== contentSegment) {

      // Need a far pointer.

      trace('Initializing far pointer %s -> %s.', this, contentSegment);

      if (!contentSegment.hasCapacity(8)) {

        // GAH! Not enough space in this pointer's segment for a landing pad so we need a double far pointer.

        const landingPad = this.segment.allocate(16);

        trace('GAH! Initializing double-far pointer in %s from %s -> %s.', this, contentSegment, landingPad);

        this._setFarPointer(true, landingPad.byteOffset / 8, landingPad.segment.id);
        landingPad._setFarPointer(false, contentOffset / 8, contentSegment.id);

        landingPad.byteOffset += 8;

        return new PointerAllocationResult(landingPad, 0);

      }

      // Allocate a far pointer landing pad in the target segment.

      const landingPad = contentSegment.allocate(8);

      if (landingPad.segment.id !== contentSegment.id) {

        throw new Error(INVARIANT_UNREACHABLE_CODE);

      }

      this._setFarPointer(false, landingPad.byteOffset / 8, landingPad.segment.id);

      return new PointerAllocationResult(landingPad, (contentOffset - landingPad.byteOffset + 8) / 8);

    }

    trace('Initializing intra-segment pointer %s -> %a.', this, contentOffset);

    return new PointerAllocationResult(this, (contentOffset - this.byteOffset - 8) / 8);

  }

}
