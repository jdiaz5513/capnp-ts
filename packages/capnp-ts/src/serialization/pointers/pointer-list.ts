/**
 * @author jdiaz5513
 */

import initTrace from 'debug';

import {ListElementSize} from '../list-element-size';
import {List, ListCtor} from './list';
import {Pointer, PointerCtor} from './pointer';

const trace = initTrace('capnp:list:composite');
trace('load');

export function PointerList<T extends Pointer>(PointerClass: PointerCtor<T>): ListCtor<T> {

  return class extends List<T> {

    static readonly _displayName: string = `List<${PointerClass._displayName}>`;
    static readonly _size = ListElementSize.POINTER;

    get(index: number): T {

      const c = this._getContent();

      return new PointerClass(c.segment, c.byteOffset + index * 8, this._depthLimit - 1);

    }

    set(index: number, value: T): void {

      this.get(index)._copyFrom(value);

    }

    toString(): string {

      return `Pointer_${super.toString()},cls:${PointerClass.toString()}`;

    }

  };

}
