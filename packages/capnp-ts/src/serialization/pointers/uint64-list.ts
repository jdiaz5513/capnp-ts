/**
 * @author jdiaz5513
 */

import initTrace from 'debug';

import {Uint64} from '../../types';
import {ListElementSize} from '../list-element-size';
import {List} from './list';

const trace = initTrace('capnp:list:composite');
trace('load');

export class Uint64List extends List<Uint64> {

  _initList(length: number): void {

    super._initList(ListElementSize.BYTE_8, length);

  }

  get(index: number): Uint64 {

    const c = this._getContent();

    return c.segment.getUint64(c.byteOffset + index * 8);

  }

  set(index: number, value: Uint64): void {

    const c = this._getContent();

    c.segment.setUint64(c.byteOffset + index * 8, value);

  }

  toString(): string {

    return `Uint64_${super.toString()}`;

  }

}
