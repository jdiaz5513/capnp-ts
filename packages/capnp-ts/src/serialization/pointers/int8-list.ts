/**
 * @author jdiaz5513
 */

import initTrace from 'debug';

import { ListElementSize } from '../list-element-size';
import { _ListCtor, List } from './list';
import { getContent } from './pointer';

const trace = initTrace('capnp:list:composite');
trace('load');

export class Int8List extends List<number> {

  static readonly _capnp: _ListCtor = {
    displayName: 'List<Int8>' as string,
    size: ListElementSize.BYTE,
  };

  get(index: number): number {

    const c = getContent(this);
    return c.segment.getInt8(c.byteOffset + index);

  }

  set(index: number, value: number): void {

    const c = getContent(this);
    c.segment.setInt8(c.byteOffset + index, value);

  }

  toString(): string {

    return `Int8_${super.toString()}`;

  }

}
