/**
 * @author jdiaz5513
 */

import initTrace from 'debug';

import {ListElementSize} from '../list-element-size';
import {List} from './list';

const trace = initTrace('capnp:list:composite');
trace('load');

export class Uint16List extends List<number> {

  _initList(length: number): void {

    super._initList(ListElementSize.BYTE_2, length);

  }

  get(index: number): number {

    const c = this._getContent();

    return c.segment.getUint16(c.byteOffset + index * 2);

  }

  set(index: number, value: number): void {

    const c = this._getContent();

    c.segment.setUint16(c.byteOffset + index * 2, value);

  }

  toString(): string {

    return `Uint16_${super.toString()}`;

  }

}
