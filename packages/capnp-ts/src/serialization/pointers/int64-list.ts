/**
 * @author jdiaz5513
 */

import initTrace from 'debug';

import { Int64 } from '../../types';
import { ListElementSize } from '../list-element-size';
import { _ListCtor, List } from './list';
import { getContent } from './pointer';

const trace = initTrace('capnp:list:composite');
trace('load');

export class Int64List extends List<Int64> {

  static readonly _capnp: _ListCtor = {
    displayName: 'List<Int64>' as string,
    size: ListElementSize.BYTE_8,
  };

  get(index: number): Int64 {

    const c = getContent(this);
    return c.segment.getInt64(c.byteOffset + index * 8);

  }

  set(index: number, value: Int64): void {

    const c = getContent(this);
    c.segment.setInt64(c.byteOffset + index * 8, value);

  }

  toString(): string {

    return `Int64_${super.toString()}`;

  }

}
