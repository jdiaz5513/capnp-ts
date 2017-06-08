/**
 * @author jdiaz5513
 */

import initTrace from 'debug';

import {ListElementSize} from '../list-element-size';
import {List} from './list';

const trace = initTrace('capnp:list:composite');
trace('load');

export class Uint8List extends List<number> {

  static readonly _displayName = `List<Uint8>`;
  static readonly _size = ListElementSize.BYTE;

  get(index: number): number {

    const c = this._getContent();

    return c.segment.getUint8(c.byteOffset + index);

  }

  set(index: number, value: number): void {

    const c = this._getContent();

    c.segment.setUint8(c.byteOffset + index, value);

  }

  toString(): string {

    return `Uint8_${super.toString()}`;

  }

}
