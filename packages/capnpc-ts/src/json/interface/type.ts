import * as R from "ramda";

import { IType, Type_Which } from "../types";

export const Type = {
  ANY_POINTER: Type_Which.ANY_POINTER,
  BOOL: Type_Which.BOOL,
  DATA: Type_Which.DATA,
  ENUM: Type_Which.ENUM,
  FLOAT32: Type_Which.FLOAT32,
  FLOAT64: Type_Which.FLOAT64,
  INT16: Type_Which.INT16,
  INT32: Type_Which.INT32,
  INT64: Type_Which.INT64,
  INT8: Type_Which.INT8,
  INTERFACE: Type_Which.INTERFACE,
  LIST: Type_Which.LIST,
  NO_DISCRIMINANT: 65535,
  STRUCT: Type_Which.STRUCT,
  TEXT: Type_Which.TEXT,
  UINT16: Type_Which.UINT16,
  UINT32: Type_Which.UINT32,
  UINT64: Type_Which.UINT64,
  UINT8: Type_Which.UINT8,
  VOID: Type_Which.VOID,
  _adoptableTypes: [
    Type_Which.ANY_POINTER,
    Type_Which.DATA,
    Type_Which.INTERFACE,
    Type_Which.LIST,
    Type_Which.STRUCT
  ],
  _pointerTypes: [
    Type_Which.ANY_POINTER,
    Type_Which.DATA,
    Type_Which.INTERFACE,
    Type_Which.LIST,
    Type_Which.STRUCT,
    Type_Which.TEXT
  ],

  isAdoptable(type: IType): boolean {
    return R.contains(Type.which(type), Type._adoptableTypes);
  },

  isPointer(type: IType): boolean {
    return R.contains(Type.which(type), Type._pointerTypes);
  },

  which(type: IType): Type_Which {
    if (type.anyPointer !== undefined) return Type.ANY_POINTER;
    if (type.bool !== undefined) return Type.BOOL;
    if (type.data !== undefined) return Type.DATA;
    if (type.enum !== undefined) return Type.ENUM;
    if (type.float32 !== undefined) return Type.FLOAT32;
    if (type.float64 !== undefined) return Type.FLOAT64;
    if (type.int16 !== undefined) return Type.INT16;
    if (type.int32 !== undefined) return Type.INT32;
    if (type.int64 !== undefined) return Type.INT64;
    if (type.int8 !== undefined) return Type.INT8;
    if (type.interface !== undefined) return Type.INTERFACE;
    if (type.list !== undefined) return Type.LIST;
    if (type.struct !== undefined) return Type.STRUCT;
    if (type.text !== undefined) return Type.TEXT;
    if (type.uint16 !== undefined) return Type.UINT16;
    if (type.uint32 !== undefined) return Type.UINT32;
    if (type.uint64 !== undefined) return Type.UINT64;
    if (type.uint8 !== undefined) return Type.UINT8;
    if (type.void !== undefined) return Type.VOID;

    throw new Error(`unknown union value for type: ${type}`);
  }
};
