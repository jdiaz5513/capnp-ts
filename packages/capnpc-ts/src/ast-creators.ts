/**
 * @author jdiaz5513
 */

import * as s from "capnp-ts/src/std/schema.capnp.js";
import * as capnp from "capnp-ts";
import { format, pad } from "capnp-ts/src/util";
import ts from "typescript";
import initTrace from "debug";
import { CodeGeneratorFileContext } from "./code-generator-file-context";
import { __, READONLY, STATIC, VOID_TYPE, CAPNP } from "./constants";
import * as E from "./errors";
import { getDisplayNamePrefix, getFullClassName, getJsType } from "./file";
import * as util from "./util";

const trace = initTrace("capnpc:ast-creators");

export function createClassExtends(identifierText: string): ts.HeritageClause {
  const types = [ts.createExpressionWithTypeArguments([], ts.createIdentifier(identifierText))];
  return ts.createHeritageClause(ts.SyntaxKind.ExtendsKeyword, types);
}

export function createConcreteListProperty(ctx: CodeGeneratorFileContext, field: s.Field): ts.PropertyDeclaration {
  const name = `_${util.c2t(field.getName())}`;
  const type = ts.createTypeReferenceNode(getJsType(ctx, field.getSlot().getType(), true), __);
  let u: ts.Expression | undefined;
  return ts.createProperty(__, [STATIC], name, __, type, u as ts.Expression);
}

export function createConstProperty(node: s.Node): ts.PropertyDeclaration {
  const name = util.c2s(getDisplayNamePrefix(node));
  const initializer = createValueExpression(node.getConst().getValue());

  return ts.createProperty(__, [STATIC, READONLY], name, __, __, initializer);
}

export function createExpressionBlock(
  expressions: ts.Expression[],
  returns: boolean,
  allowSingleLine: boolean
): ts.Block {
  const statements = expressions.map((e, i) =>
    i === expressions.length - 1 && returns ? ts.createReturn(e) : ts.createStatement(e)
  );

  return ts.createBlock(statements, !(allowSingleLine && expressions.length < 2));
}

export function createMethod(
  name: string,
  parameters: ts.ParameterDeclaration[],
  type: ts.TypeNode | undefined,
  expressions: ts.Expression[],
  allowSingleLine = true
): ts.MethodDeclaration {
  return ts.createMethod(
    __,
    __,
    __,
    name,
    __,
    __,
    parameters,
    type,
    createExpressionBlock(expressions, type !== VOID_TYPE, allowSingleLine)
  );
}

export function createNestedNodeProperty(node: s.Node): ts.PropertyDeclaration {
  const name = getDisplayNamePrefix(node);
  const initializer = ts.createIdentifier(getFullClassName(node));

  return ts.createProperty(__, [STATIC, READONLY], name, __, __, initializer);
}

export function createUnionConstProperty(fullClassName: string, field: s.Field): ts.PropertyDeclaration {
  const name = util.c2s(field.getName());
  const initializer = ts.createPropertyAccess(ts.createIdentifier(`${fullClassName}_Which`), name);

  return ts.createProperty(__, [STATIC, READONLY], name, __, __, initializer);
}

export function createValueExpression(value: s.Value): ts.Expression {
  trace("createValueExpression(%s)", value);

  let p: capnp.Pointer;

  switch (value.which()) {
    case s.Value.BOOL:
      return value.getBool() ? ts.createTrue() : ts.createFalse();

    case s.Value.ENUM:
      return ts.createNumericLiteral(value.getEnum().toString());

    case s.Value.FLOAT32:
      return ts.createNumericLiteral(value.getFloat32().toString());

    case s.Value.FLOAT64:
      return ts.createNumericLiteral(value.getFloat64().toString());

    case s.Value.INT16:
      return ts.createNumericLiteral(value.getInt16().toString());

    case s.Value.INT32:
      return ts.createNumericLiteral(value.getInt32().toString());

    case s.Value.INT64: {
      const int64 = value.getInt64();
      const int64Bytes: string[] = [];

      for (let i = 0; i < 8; i++) {
        int64Bytes.push(`0x${pad(int64.buffer[i].toString(16), 2)}`);
      }

      const int64ByteArray = ts.createArrayLiteral(int64Bytes.map(ts.createNumericLiteral), false);
      const int64ArrayBuffer = ts.createNew(ts.createIdentifier("Uint8Array"), __, [int64ByteArray]);
      return ts.createNew(ts.createIdentifier("capnp.Int64"), __, [int64ArrayBuffer]);
    }
    case s.Value.INT8:
      return ts.createNumericLiteral(value.getInt8().toString());

    case s.Value.TEXT:
      return ts.createLiteral(value.getText());

    case s.Value.UINT16:
      return ts.createNumericLiteral(value.getUint16().toString());

    case s.Value.UINT32:
      return ts.createNumericLiteral(value.getUint32().toString());

    case s.Value.UINT64: {
      const uint64 = value.getUint64();
      const uint64Bytes: string[] = [];

      for (let i = 0; i < 8; i++) {
        uint64Bytes.push(`0x${pad(uint64.buffer[i].toString(16), 2)}`);
      }

      const uint64ByteArray = ts.createArrayLiteral(uint64Bytes.map(ts.createNumericLiteral), false);
      const uint64ArrayBuffer = ts.createNew(ts.createIdentifier("Uint8Array"), __, [uint64ByteArray]);
      return ts.createNew(ts.createIdentifier("capnp.Int64"), __, [uint64ArrayBuffer]);
    }
    case s.Value.UINT8:
      return ts.createNumericLiteral(value.getUint8().toString());

    case s.Value.VOID:
      return ts.createIdentifier("undefined");

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
      const __S = capnp.Struct;
      __S.testWhich("interface", __S.getUint16(0, value), 17, value);
      p = __S.getPointer(0, value);

      break;

    default:
      throw new Error(format(E.GEN_SERIALIZE_UNKNOWN_VALUE, s.Value_Which[value.which()]));
  }

  const m = new capnp.Message();
  m.setRoot(p);

  const buf = new Uint8Array(m.toPackedArrayBuffer());
  const bytes = new Array<ts.NumericLiteral>(buf.byteLength);

  for (let i = 0; i < buf.byteLength; i++) {
    bytes[i] = ts.createNumericLiteral(`0x${pad(buf[i].toString(16), 2)}`);
  }

  return ts.createCall(ts.createPropertyAccess(CAPNP, "readRawPointer"), __, [
    ts.createPropertyAccess(
      ts.createNew(ts.createIdentifier("Uint8Array"), __, [ts.createArrayLiteral(bytes, false)]),
      "buffer"
    ),
  ]);
}
