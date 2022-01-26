/**
 * @author jdiaz5513
 */

import { ListElementSize } from "../list-element-size";
import { _ListCtor, List } from "./list";
import { getContent } from "./pointer";

export class Float64List extends List<number> {
  static readonly _capnp: _ListCtor = {
    displayName: "List<Float64>" as string,
    size: ListElementSize.BYTE_8,
  };

  get(index: number): number {
    const c = getContent(this);

    return c.segment.getFloat64(c.byteOffset + index * 8);
  }

  set(index: number, value: number): void {
    const c = getContent(this);

    c.segment.setFloat64(c.byteOffset + index * 8, value);
  }

  toString(): string {
    return `Float64_${super.toString()}`;
  }
}
