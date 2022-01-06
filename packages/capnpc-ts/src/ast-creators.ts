/**
 * @author jdiaz5513
 */

import * as s from "capnp-ts/src/std/schema.capnp.js";
import * as capnp from "capnp-ts";
import { format, pad } from "capnp-ts/src/util";
import ts, { factory as f } from "typescript";
import initTrace from "debug";
import { CodeGeneratorFileContext } from "./code-generator-file-context";
import { __, READONLY, STATIC, VOID_TYPE, CAPNP } from "./constants";
import * as E from "./errors";
import { getDisplayNamePrefix, getFullClassName, getJsType } from "./file";
import * as util from "./util";

const trace = initTrace("capnpc:ast-creators");

export function createBigIntExpression(value: bigint): ts.Expression {
  let v = value.toString(16);
  let neg = "";
  if (v[0] === "-") {
    v = v.slice(1);
    neg = "-";
  }
  return f.createCallExpression(f.createIdentifier(`${neg}BigInt`), __, [f.createStringLiteral(`0x${v}`)]);
}

export function createClassExtends(identifierText: string): ts.HeritageClause {
  const types = [f.createExpressionWithTypeArguments(f.createIdentifier(identifierText), [])];
  return f.createHeritageClause(ts.SyntaxKind.ExtendsKeyword, types);
}

export function createConcreteListProperty(ctx: CodeGeneratorFileContext, field: s.Field): ts.PropertyDeclaration {
  const name = `_${util.c2t(field.getName())}`;
  const type = f.createTypeReferenceNode(getJsType(ctx, field.getSlot().getType(), true), __);
  let u: ts.Expression | undefined;
  return f.createPropertyDeclaration(__, [STATIC], name, __, type, u as ts.Expression);
}

export function createConstProperty(node: s.Node): ts.PropertyDeclaration {
  const name = util.c2s(getDisplayNamePrefix(node));
  const initializer = createValueExpression(node.getConst().getValue());

  return f.createPropertyDeclaration(__, [STATIC, READONLY], name, __, __, initializer);
}

export function createExpressionBlock(
  expressions: ts.Expression[],
  returns: boolean,
  allowSingleLine: boolean
): ts.Block {
  const statements = expressions.map((e, i) =>
    i === expressions.length - 1 && returns ? f.createReturnStatement(e) : f.createExpressionStatement(e)
  );

  return f.createBlock(statements, !(allowSingleLine && expressions.length < 2));
}

export function createMethod(
  name: string,
  parameters: ts.ParameterDeclaration[],
  type: ts.TypeNode | undefined,
  expressions: ts.Expression[],
  allowSingleLine = true
): ts.MethodDeclaration {
  return f.createMethodDeclaration(
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
  const initializer = f.createIdentifier(getFullClassName(node));

  return f.createPropertyDeclaration(__, [STATIC, READONLY], name, __, __, initializer);
}

export function createUnionConstProperty(fullClassName: string, field: s.Field): ts.PropertyDeclaration {
  const name = util.c2s(field.getName());
  const initializer = f.createPropertyAccessExpression(f.createIdentifier(`${fullClassName}_Which`), name);

  return f.createPropertyDeclaration(__, [STATIC, READONLY], name, __, __, initializer);
}

export function createValueExpression(value: s.Value): ts.Expression {
  trace("createValueExpression(%s)", value);

  let p: capnp.Pointer;

  switch (value.which()) {
    case s.Value.BOOL:
      return value.getBool() ? f.createTrue() : f.createFalse();

    case s.Value.ENUM:
      return f.createNumericLiteral(value.getEnum().toString());

    case s.Value.FLOAT32:
      return f.createNumericLiteral(value.getFloat32().toString());

    case s.Value.FLOAT64:
      return f.createNumericLiteral(value.getFloat64().toString());

    case s.Value.INT16:
      return f.createNumericLiteral(value.getInt16().toString());

    case s.Value.INT32:
      return f.createNumericLiteral(value.getInt32().toString());

    case s.Value.INT64: {
      return createBigIntExpression(value.getInt64());
    }
    case s.Value.INT8:
      return f.createNumericLiteral(value.getInt8().toString());

    case s.Value.TEXT:
      return f.createStringLiteral(value.getText());

    case s.Value.UINT16:
      return f.createNumericLiteral(value.getUint16().toString());

    case s.Value.UINT32:
      return f.createNumericLiteral(value.getUint32().toString());

    case s.Value.UINT64: {
      return createBigIntExpression(value.getUint64());
    }
    case s.Value.UINT8:
      return f.createNumericLiteral(value.getUint8().toString());

    case s.Value.VOID:
      return f.createIdentifier("undefined");

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
      {
        const __S = capnp.Struct;
        __S.testWhich("interface", __S.getUint16(0, value), 17, value);
        p = __S.getPointer(0, value);
      }

      break;

    default:
      throw new Error(format(E.GEN_SERIALIZE_UNKNOWN_VALUE, s.Value_Which[value.which()]));
  }

  const m = new capnp.Message();
  m.setRoot(p);

  const buf = new Uint8Array(m.toPackedArrayBuffer());
  const bytes = new Array<ts.NumericLiteral>(buf.byteLength);

  for (let i = 0; i < buf.byteLength; i++) {
    bytes[i] = f.createNumericLiteral(`0x${pad(buf[i].toString(16), 2)}`);
  }

  return f.createCallExpression(f.createPropertyAccessExpression(CAPNP, "readRawPointer"), __, [
    f.createPropertyAccessExpression(
      f.createNewExpression(f.createIdentifier("Uint8Array"), __, [f.createArrayLiteralExpression(bytes, false)]),
      "buffer"
    ),
  ]);
}
