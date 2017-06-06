import {pad} from 'capnp-ts/lib/util';

import {decToHexBytes, decToInt64} from '../../../util';
import {IValue, Value_Which} from '../types';

export const Value = {
  ANY_POINTER: Value_Which.ANY_POINTER,
  BOOL: Value_Which.BOOL,
  DATA: Value_Which.DATA,
  ENUM: Value_Which.ENUM,
  FLOAT32: Value_Which.FLOAT32,
  FLOAT64: Value_Which.FLOAT64,
  INT16: Value_Which.INT16,
  INT32: Value_Which.INT32,
  INT64: Value_Which.INT64,
  INT8: Value_Which.INT8,
  INTERFACE: Value_Which.INTERFACE,
  LIST: Value_Which.LIST,
  STRUCT: Value_Which.STRUCT,
  TEXT: Value_Which.TEXT,
  UINT16: Value_Which.UINT16,
  UINT32: Value_Which.UINT32,
  UINT64: Value_Which.UINT64,
  UINT8: Value_Which.UINT8,
  VOID: Value_Which.VOID,

  toJsPrimitive(value: IValue): string {

    switch (Value.which(value)) {

      case Value.BOOL:

        return JSON.stringify(value.bool);

      case Value.ENUM:

        return JSON.stringify(value.enum);

      case Value.FLOAT32:

        return JSON.stringify(value.float32);

      case Value.FLOAT64:

        return JSON.stringify(value.float64);

      case Value.INT16:

        return JSON.stringify(value.int16);

      case Value.INT32:

        return JSON.stringify(value.int32);

      case Value.INT64:

        if (value.int64 === undefined) throw new Error('wat');

        const v = decToInt64(value.int64);
        const bytes: string[] = [];

        for (let i = 0; i < 4; i++) bytes.push(`0x${pad(v.buffer[i].toString(16), 2)}`);

        return `new capnp.Int64(new Uint8Array([${bytes.join(', ')}]))`;

      case Value.INT8:

        return JSON.stringify(value.int8);

      case Value.TEXT:

        return JSON.stringify(value.text);

      case Value.UINT16:

        return JSON.stringify(value.uint16);

      case Value.UINT32:

        return JSON.stringify(value.uint32);

      case Value.UINT64:

        if (value.uint64 === undefined) throw new Error('wat');

        const bs = decToHexBytes(value.uint64).map((b) => `0x${pad(b, 2)}`).join(', ');

        return `new capnp.Uint64(new Uint8Array([${bs}]))`;

      case Value.UINT8:

        return JSON.stringify(value.uint8);

      case Value.VOID:

        return 'undefined';

      case Value.ANY_POINTER:
      case Value.DATA:
      case Value.INTERFACE:
      case Value.LIST:
      case Value.STRUCT:
      default:

        throw new Error(`don't know how to serialize value ${JSON.stringify(value)}`);

    }

  },

  which(value: IValue): Value_Which {

    if (value.anyPointer !== undefined) return Value.ANY_POINTER;
    if (value.bool !== undefined) return Value.BOOL;
    if (value.data !== undefined) return Value.DATA;
    if (value.enum !== undefined) return Value.ENUM;
    if (value.float32 !== undefined) return Value.FLOAT32;
    if (value.float64 !== undefined) return Value.FLOAT64;
    if (value.int16 !== undefined) return Value.INT16;
    if (value.int32 !== undefined) return Value.INT32;
    if (value.int64 !== undefined) return Value.INT64;
    if (value.int8 !== undefined) return Value.INT8;
    if (value.interface !== undefined) return Value.INTERFACE;
    if (value.list !== undefined) return Value.LIST;
    if (value.struct !== undefined) return Value.STRUCT;
    if (value.text !== undefined) return Value.TEXT;
    if (value.uint16 !== undefined) return Value.UINT16;
    if (value.uint32 !== undefined) return Value.UINT32;
    if (value.uint64 !== undefined) return Value.UINT64;
    if (value.uint8 !== undefined) return Value.UINT8;
    if (value.void !== undefined) return Value.VOID;

    throw new Error(`unknown union value for type: ${value}`);

  },

};
