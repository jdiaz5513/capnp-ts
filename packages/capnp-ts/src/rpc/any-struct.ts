import { ObjectSize } from "../serialization/object-size";
import { Struct } from "../serialization/pointers/struct";

/**
 * A zero-size struct view used to walk PromisedAnswer transform paths without schema
 * knowledge; reads never resize because every struct is at least (0, 0).
 */

export class AnyStruct extends Struct {
  static readonly _capnp = {
    displayName: "AnyStruct",
    id: "0",
    size: new ObjectSize(0, 0),
  };
}
