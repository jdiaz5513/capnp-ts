/**
 * @author jdiaz5513
 */

import initTrace from 'debug';

import {PTR_COMPOSITE_SIZE_UNDEFINED, PTR_INVALID_LIST_SIZE} from '../../errors';
import {format, identity} from '../../util';
import {ListElementSize} from '../list-element-size';
import {ObjectSize} from '../object-size';
import {Segment} from '../segment';
import {Pointer} from './pointer';

const trace = initTrace('capnp:list');
trace('load');

export interface ListCtor<T> {

  readonly _compositeSize?: ObjectSize;
  readonly _displayName: string;
  readonly _size: ListElementSize;

  new(segment: Segment, byteOffset: number, depthLimit?: number): List<T>;

}

export class List<T> extends Pointer {

  static readonly _compositeSize?: ObjectSize;
  static readonly _displayName: string = 'List<Generic>';
  static readonly _size: ListElementSize;

  every(callbackFn: (this: void, value: T, index: number) => boolean): boolean {

    const length = this.getLength();

    for (let i = 0; i < length; i++) {

      if (!callbackFn(this.get(i), i)) return false;

    }

    return true;

  }

  filter(callbackFn: (this: void, value: T, index: number) => boolean): T[] {

    const length = this.getLength();
    const res: T[] = [];

    for (let i = 0; i < length; i++) {

      const value = this.get(i);

      if (callbackFn(value, i)) res.push(value);

    }

    return res;

  }

  find(callbackFn: (this: void, value: T, index: number) => boolean): T | undefined {

    const length = this.getLength();

    for (let i = 0; i < length; i++) {

      const value = this.get(i);

      if (callbackFn(value, i)) return value;

    }

    return undefined;

  }

  forEach(callbackFn: (this: void, value: T, index: number) => void): void {

    const length = this.getLength();

    for (let i = 0; i < length; i++) callbackFn(this.get(i), i);

  }

  get(_index: number): T {

    throw new TypeError();

  }

  /**
   * Get the length of this list.
   *
   * @returns {number} The number of elements in this list.
   */

  getLength(): number {

    return this._getTargetListLength();

  }

  map<U>(callbackFn: (this: void, value: T, index: number) => U): U[] {

    const length = this.getLength();
    const res: U[] = new Array(length);

    for (let i = 0; i < length; i++) res[i] = callbackFn(this.get(i), i);

    return res;

  }

  reduce<U>(callbackFn: (previousValue: U, currentValue: T, currentIndex: number) => U, initialValue?: U): U {

    let i = 0;
    let res: U;

    if (initialValue === undefined) {

      // LINT: It's okay, I know what I'm doing here.
      /* tslint:disable-next-line:no-any */
      res = this.get(0) as any;
      i++;

    } else {

      res = initialValue;

    }

    for (; i < this.getLength(); i++) res = callbackFn(res, this.get(i), i);

    return res;

  }

  set(_index: number, _value: T): void {

    throw new TypeError();

  }

  some(callbackFn: (this: void, value: T, index: number) => boolean): boolean {

    const length = this.getLength();

    for (let i = 0; i < length; i++) {

      if (callbackFn(this.get(i), i)) return true;

    }

    return false;

  }

  toArray(): T[] {

    return this.map(identity);

  }

  toString(): string {

    return `List_${super.toString()}`;

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

}
