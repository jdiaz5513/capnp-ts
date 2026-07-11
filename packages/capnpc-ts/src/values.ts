/**
 * Encodes schema constant/default values as TypeScript expression source text.
 *
 * Pointer values (struct/list/data/anyPointer) round-trip through the capnp runtime:
 * copy into a fresh message, pack, and emit the packed bytes into a
 * `capnp.readRawPointer(new Uint8Array([...]).buffer)` call.
 */

import * as s from "capnp-ts/src/std/schema.capnp.js";
import * as capnp from "capnp-ts";
import { format, pad } from "capnp-ts/src/util";

import * as E from "./errors";
import { num, str } from "./text";

export function createValueExpression(value: s.Value): string {
  let p: capnp.Pointer;

  switch (value.which()) {
    case s.Value.BOOL:
      return value.getBool() ? "true" : "false";

    case s.Value.ENUM:
      return value.getEnum().toString();

    case s.Value.FLOAT32:
      return num(value.getFloat32());

    case s.Value.FLOAT64:
      return num(value.getFloat64());

    case s.Value.INT16:
      return num(value.getInt16());

    case s.Value.INT32:
      return num(value.getInt32());

    case s.Value.INT64: {
      let v = value.getInt64().toString(16);
      let neg = "";
      if (v[0] === "-") {
        v = v.slice(1);
        neg = "-";
      }
      return `${neg}BigInt(${str(`0x${v}`)})`;
    }
    case s.Value.INT8:
      return num(value.getInt8());

    case s.Value.TEXT:
      return str(value.getText());

    case s.Value.UINT16:
      return value.getUint16().toString();

    case s.Value.UINT32:
      return value.getUint32().toString();

    case s.Value.UINT64:
      return `BigInt(${str(`0x${value.getUint64().toString(16)}`)})`;

    case s.Value.UINT8:
      return value.getUint8().toString();

    case s.Value.VOID:
      return "undefined";

    case s.Value.ANY_POINTER:
      p = value.getAnyPointer();

      break;

    case s.Value.DATA:
      p = value.getData();

      break;

    case s.Value.LIST:
      p = value.getList();

      break;

    case s.Value.STRUCT:
      p = value.getStruct();

      break;

    case s.Value.INTERFACE:
    default:
      throw new Error(format(E.GEN_SERIALIZE_UNKNOWN_VALUE, s.Value_Which[value.which()]));
  }

  const m = new capnp.Message();
  m.setRoot(p);

  const buf = new Uint8Array(m.toPackedArrayBuffer());
  const bytes = new Array<string>(buf.byteLength);

  for (let i = 0; i < buf.byteLength; i++) {
    bytes[i] = `0x${pad(buf[i].toString(16), 2)}`;
  }

  return `capnp.readRawPointer(new Uint8Array([${bytes.join(", ")}]).buffer)`;
}
