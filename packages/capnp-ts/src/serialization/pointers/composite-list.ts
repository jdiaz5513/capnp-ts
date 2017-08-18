/**
 * @author jdiaz5513
 */

import initTrace from 'debug';

import {ListElementSize} from '../list-element-size';
import {List, ListCtor} from './list';
import {Struct, StructCtor} from './struct';

const trace = initTrace('capnp:list:composite');
trace('load');

export function CompositeList<T extends Struct>(CompositeClass: StructCtor<T>): ListCtor<T> {

  return class extends List<T> {

    static readonly _compositeSize = CompositeClass._size;
    static readonly _displayName = `List<${CompositeClass._displayName}>`;
    static readonly _size = ListElementSize.COMPOSITE;

    get(index: number): T {

      return new CompositeClass(this.segment, this.byteOffset, this._depthLimit - 1, index);

    }

    set(index: number, value: T): void {

      this.get(index)._copyFrom(value);

    }

    toString(): string {

      return `Composite_${super.toString()},cls:${CompositeClass.toString()}`;

    }

  };

}
