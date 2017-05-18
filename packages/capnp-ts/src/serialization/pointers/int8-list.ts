/**
 * @author jdiaz5513
 */

import initTrace from 'debug';

import {ListElementSize} from '../list-element-size';
import {List} from './list';

const trace = initTrace('capnp:list:composite');
trace('load');

export class Int8List extends List<number> {

  _initList(length: number): void {

    super._initList(ListElementSize.BYTE, length);

  }

  get(index: number): number {

    const c = this._getContent();

    return c.segment.getInt8(c.byteOffset + index);

  }

  set(index: number, value: number): void {

    const c = this._getContent();

    c.segment.setInt8(c.byteOffset + index, value);

  }

  toString(): string {

    return `Int8_${super.toString()}`;

  }

}
