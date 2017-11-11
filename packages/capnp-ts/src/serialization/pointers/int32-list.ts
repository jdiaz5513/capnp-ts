/**
 * @author jdiaz5513
 */

import initTrace from 'debug';

import { ListElementSize } from '../list-element-size';
import { _ListCtor, List } from './list';

const trace = initTrace('capnp:list:composite');
trace('load');

export class Int32List extends List<number> {

  static readonly _capnp: _ListCtor = {
    displayName: 'List<Int32>' as string,
    size: ListElementSize.BYTE_4,
  };

  get(index: number): number {

    const c = this._getContent();

    return c.segment.getInt32(c.byteOffset + index * 4);

  }

  set(index: number, value: number): void {

    const c = this._getContent();

    c.segment.setInt32(c.byteOffset + index * 4, value);

  }

  toString(): string {

    return `Int32_${super.toString()}`;

  }

}
