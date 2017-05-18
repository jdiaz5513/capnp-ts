/**
 * @author jdiaz5513
 */

import initTrace from 'debug';

import {ListElementSize} from '../list-element-size';
import {List} from './list';

const trace = initTrace('capnp:list:composite');
trace('load');

export class BoolList extends List<boolean> {

  _initList(length: number): void {

    super._initList(ListElementSize.BIT, length);

  }

  get(index: number): boolean {

    const bitMask = 1 << index % 8;
    const byteOffset = index >>> 3;
    const c = this._getContent();
    const v = c.segment.getUint8(c.byteOffset + byteOffset);

    return (v & bitMask) !== 0;

  }

  set(index: number, value: boolean): void {

    const bitMask = 1 << index % 8;
    const c = this._getContent();
    const byteOffset = c.byteOffset + (index >>> 3);
    const v = c.segment.getUint8(byteOffset);

    c.segment.setUint8(byteOffset, value ? v | bitMask : v & ~bitMask);

  }

  toString(): string {

    return `Uint8_${super.toString()}`;

  }

}
