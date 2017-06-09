/**
 * @author jdiaz5513
 */

import initTrace from 'debug';

import {ListElementSize} from '../list-element-size';
import {List} from './list';
import {Text} from './text';

const trace = initTrace('capnp:list:composite');
trace('load');

export class TextList extends List<string> {

  static readonly _displayName = `List<Text>`;
  static readonly _size = ListElementSize.POINTER;

  get(index: number): string {

    const c = this._getContent();

    c.byteOffset += index * 8;

    return Text.fromPointer(c).get(0);

  }

  set(index: number, value: string): void {

    const c = this._getContent();

    c.byteOffset += index * 8;

    Text.fromPointer(c).set(0, value);

  }

  toString(): string {

    return `Text_${super.toString()}`;

  }

}
