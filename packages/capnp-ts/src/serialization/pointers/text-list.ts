/**
 * @author jdiaz5513
 */

import initTrace from "debug";

import { ListElementSize } from "../list-element-size";
import { _ListCtor, List } from "./list";
import { Text } from "./text";
import { getContent } from "./pointer";

const trace = initTrace("capnp:list:composite");
trace("load");

export class TextList extends List<string> {
  static readonly _capnp: _ListCtor = {
    displayName: "List<Text>" as string,
    size: ListElementSize.POINTER
  };

  get(index: number): string {
    const c = getContent(this);

    c.byteOffset += index * 8;

    return Text.fromPointer(c).get(0);
  }

  set(index: number, value: string): void {
    const c = getContent(this);

    c.byteOffset += index * 8;

    Text.fromPointer(c).set(0, value);
  }

  toString(): string {
    return `Text_${super.toString()}`;
  }
}
