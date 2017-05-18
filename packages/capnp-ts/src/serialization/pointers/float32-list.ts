/**
 * @author jdiaz5513
 */

import initTrace from 'debug';

import {ListElementSize} from '../list-element-size';
import {List} from './list';

const trace = initTrace('capnp:list:composite');
trace('load');

export class Float32List extends List<number> {

  _initList(length: number): void {

    super._initList(ListElementSize.BYTE_4, length);

  }

  get(index: number): number {

    const c = this._getContent();

    return c.segment.getFloat32(c.byteOffset + index * 4);

  }

  set(index: number, value: number): void {

    const c = this._getContent();

    c.segment.setFloat32(c.byteOffset + index * 4, value);

  }

  toString(): string {

    return `Float32_${super.toString()}`;

  }

}
