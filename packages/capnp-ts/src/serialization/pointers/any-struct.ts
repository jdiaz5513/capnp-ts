import { ObjectSize } from "../object-size";
import { Struct } from "./struct";

export class AnyStruct extends Struct {
  static readonly _capnp = {
    displayName: "AnyStruct",
    id: "0",
    size: new ObjectSize(0, 0),
  };
}
