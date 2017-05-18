/**
 * @author jdiaz5513
 */

import initTrace from 'debug';

import {ListElementSize} from '../list-element-size';
import {List} from './list';

const trace = initTrace('capnp:list:composite');
trace('load');

export class Float64List extends List<number> {

  _initList(length: number): void {

    super._initList(ListElementSize.BYTE_8, length);

  }

  get(index: number): number {

    const c = this._getContent();

    return c.segment.getFloat64(c.byteOffset + index * 8);

  }

  set(index: number, value: number): void {

    const c = this._getContent();

    c.segment.setFloat64(c.byteOffset + index * 8, value);

  }

  toString(): string {

    return `Float64_${super.toString()}`;

  }

}
