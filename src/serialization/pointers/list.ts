/**
 * @author jdiaz5513
 */

import initTrace from 'debug';

import {PTR_COMPOSITE_SIZE_UNDEFINED, PTR_INVALID_LIST_SIZE} from '../../errors';
import {format} from '../../util';
import {ListElementSize} from '../list-element-size';
import {ObjectSize} from '../object-size';
import {Pointer} from './pointer';

const trace = initTrace('capnp:list');
trace('load');

export class List<T> extends Pointer {

  get(_index: number): T {

    throw new TypeError();

  }

  set(_index: number, _value: T): void {

    throw new TypeError();

  }

  /**
   * Initialize this list with the given element size and length. This will allocate new space for the list, ideally in
   * the same segment as this pointer.
   *
   * @internal
   * @param {ListElementSize} elementSize The size of each element in the list.
   * @param {number} length The number of elements in the list.
   * @param {ObjectSize} [compositeSize] The size of each element in a composite list. This value is required for
   * composite lists.
   * @returns {void}
   */

  _initList(elementSize: ListElementSize, length: number, compositeSize?: ObjectSize): void {

    let c: Pointer;

    switch (elementSize) {

      case ListElementSize.BIT:

        c = this.segment.allocate(Math.ceil(length / 8));

        break;

      case ListElementSize.BYTE:
      case ListElementSize.BYTE_2:
      case ListElementSize.BYTE_4:
      case ListElementSize.BYTE_8:
      case ListElementSize.POINTER:

        c = this.segment.allocate(length * Pointer._getListElementByteLength(elementSize));

        break;

      case ListElementSize.COMPOSITE:

        if (compositeSize === undefined) throw new Error(format(PTR_COMPOSITE_SIZE_UNDEFINED));

        compositeSize = compositeSize.padToWord();

        const byteLength = compositeSize.getByteLength() * length;

        // We need to allocate an extra 8 bytes for the tag word, then make sure we write the length to it. We advance
        // the content pointer by 8 bytes so that it then points to the first list element as intended. Everything
        // starts off zeroed out so these nested structs don't need to be initialized in any way.

        c = this.segment.allocate(byteLength + 8);

        c._setStructPointer(length, compositeSize);

        trace('Wrote composite tag word %s for %s.', c, this);

        c.byteOffset += 8;

        break;

      case ListElementSize.VOID:

        // No need to allocate anything, we can write the list pointer right here.

        this._setListPointer(0, elementSize, length);

        return;

      default:

        throw new Error(format(PTR_INVALID_LIST_SIZE, elementSize));

    }

    const res = this._initPointer(c.segment, c.byteOffset);

    res.pointer._setListPointer(res.offsetWords, elementSize, length, compositeSize);

  }

  /**
   * Get the length of this list.
   *
   * @returns {number} The number of elements in this list.
   */

  getLength(): number {

    return this._getTargetListLength();

  }

  toString(): string {

    return `List_${super.toString()}`;

  }

}
