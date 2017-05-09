/**
 * @author jdiaz5513
 */

import initTrace from 'debug';

import {ListElementSize} from '../list-element-size';
import {Segment} from '../segment';
import {List} from './list';
import {Pointer} from './pointer';
import {PointerType} from './pointer-type';
import {Struct, StructCtor} from './struct';

const trace = initTrace('capnp:list:composite');
trace('load');

export class CompositeList<T extends Struct> extends List<T> {

  private readonly _CompositeClass: StructCtor<T>;

  constructor(CompositeClass: StructCtor<T>, segment: Segment, byteOffset: number, depthLimit?: number) {

    super(segment, byteOffset, depthLimit);

    this._CompositeClass = CompositeClass;

  }

  static fromPointer<T extends Struct>(CompositeClass: StructCtor<T>, pointer: Pointer): CompositeList<T> {

    pointer._checkPointerType(PointerType.LIST, ListElementSize.COMPOSITE);

    return this._fromPointerUnchecked(CompositeClass, pointer);

  }

  protected static _fromPointerUnchecked<T extends Struct>(CompositeClass: StructCtor<T>,
                                                           pointer: Pointer): CompositeList<T> {

    return new this(CompositeClass, pointer.segment, pointer.byteOffset, pointer._depthLimit);

  }

  toString(): string {

    return `Composite_${super.toString()},cls:${this._CompositeClass.toString()}`;

  }

  /**
   * Initialize this composite list with the given length. This will allocate new space for the list, ideally in the
   * same segment as this pointer.
   *
   * @param {number} length The number of elements in the list.
   * @returns {void}
   */

  _initList(length: number): void {

    super._initList(ListElementSize.COMPOSITE, length, this._CompositeClass._size);

  }

  get(index: number): T {

    return new this._CompositeClass(this.segment, this.byteOffset, this._depthLimit - 1, index);

  }

  set(index: number, value: T): void {

    this.get(index)._copyStruct(value);

  }

}
