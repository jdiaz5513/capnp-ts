/**
 * @author jdiaz5513
 */

import initTrace from 'debug';

import {Int64} from '../../types';
import {ListElementSize} from '../list-element-size';
import {List} from './list';

const trace = initTrace('capnp:list:composite');
trace('load');

export class Int64List extends List<Int64> {

  _initList(length: number): void {

    super._initList(ListElementSize.BYTE_8, length);

  }

  get(index: number): Int64 {

    const c = this._getContent();

    return c.segment.getInt64(c.byteOffset + index * 8);

  }

  set(index: number, value: Int64): void {

    const c = this._getContent();

    c.segment.setInt64(c.byteOffset + index * 8, value);

  }

  toString(): string {

    return `Int64_${super.toString()}`;

  }

}
