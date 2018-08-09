import { Type } from "./type";

export const Primitive = {
  [Type.BOOL]: { byteLength: 1, getter: "getBit", setter: "setBit" },
  [Type.ENUM]: { byteLength: 2, getter: "getUint16", setter: "setUint16" },
  [Type.FLOAT32]: { byteLength: 4, getter: "getFloat32", setter: "setFloat32" },
  [Type.FLOAT64]: { byteLength: 8, getter: "getFloat64", setter: "setFloat64" },
  [Type.INT16]: { byteLength: 2, getter: "getInt16", setter: "setInt16" },
  [Type.INT32]: { byteLength: 4, getter: "getInt32", setter: "setInt32" },
  [Type.INT64]: { byteLength: 8, getter: "getInt64", setter: "setInt64" },
  [Type.INT8]: { byteLength: 1, getter: "getInt8", setter: "setInt8" },
  [Type.UINT16]: { byteLength: 2, getter: "getUint16", setter: "setUint16" },
  [Type.UINT32]: { byteLength: 4, getter: "getUint32", setter: "setUint32" },
  [Type.UINT64]: { byteLength: 8, getter: "getUint64", setter: "setUint64" },
  [Type.UINT8]: { byteLength: 1, getter: "getUint8", setter: "setUint8" }
};
