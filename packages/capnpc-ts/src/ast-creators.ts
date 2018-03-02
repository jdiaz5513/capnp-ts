/**
 * @author jdiaz5513
 */

import * as s from 'capnp-ts/lib/std/schema.capnp';
import { format, pad } from 'capnp-ts/lib/util';
import * as ts from 'typescript';

import { CodeGeneratorFileContext } from './code-generator-file-context';
import { __, READONLY, STATIC, VOID_TYPE } from './constants';
import * as E from './errors';
import { getDisplayNamePrefix, getFullClassName, getJsType } from './file';
import * as util from './util';

export function createClassExtends(identifierText: string): ts.HeritageClause {

  const types = [ts.createExpressionWithTypeArguments([], ts.createIdentifier(identifierText))];
  return ts.createHeritageClause(ts.SyntaxKind.ExtendsKeyword, types);

}

export function createConcreteListProperty(ctx: CodeGeneratorFileContext, field: s.Field): ts.PropertyDeclaration {

  const name = `_${util.c2t(field.getName())}`;
  const type = ts.createTypeReferenceNode(getJsType(ctx, field.getSlot().getType(), true), __);
  // LINT: This is a dirty way to force the initializer to be undefined...
  /* tslint:disable-next-line */
  let u: ts.Expression | undefined;
  return ts.createProperty(__, [STATIC], name, __, type, u as ts.Expression);

}

export function createConstProperty(node: s.Node): ts.PropertyDeclaration {

  const name = util.c2s(getDisplayNamePrefix(node));
  const initializer = createValueExpression(node.getConst().getValue());

  return ts.createProperty(__, [STATIC, READONLY], name, __, __, initializer);

}

export function createExpressionBlock(
  expressions: ts.Expression[], returns: boolean, allowSingleLine: boolean): ts.Block {

  const statements = expressions.map(
    (e, i) => i === expressions.length - 1 && returns ? ts.createReturn(e) : ts.createStatement(e));

  return ts.createBlock(statements, !(allowSingleLine && expressions.length < 2));

}

export function createMethod(
  name: string, parameters: ts.ParameterDeclaration[], type: ts.TypeNode | undefined, expressions: ts.Expression[],
  allowSingleLine = true): ts.MethodDeclaration {

  return ts.createMethod(
    __, __, __, name, __, __, parameters, type, createExpressionBlock(
      expressions, type !== VOID_TYPE, allowSingleLine));

}

export function createNestedNodeProperty(node: s.Node): ts.PropertyDeclaration {

  const name = getDisplayNamePrefix(node);
  const initializer = ts.createIdentifier(getFullClassName(node));

  return ts.createProperty(__, [STATIC, READONLY], name, __, __, initializer);

}

export function createParameter(
  name: string, type: ts.TypeNode): ts.ParameterDeclaration {

  return ts.createParameter(__, __, __, ts.createIdentifier(name), __, type, __);

}

export function createUnionConstProperty(fullClassName: string, field: s.Field): ts.PropertyDeclaration {

  const name = util.c2s(field.getName());
  const initializer = ts.createPropertyAccess(ts.createIdentifier(`${fullClassName}_Which`), name);

  return ts.createProperty(__, [STATIC, READONLY], name, __, __, initializer);

}

export function createValueExpression(value: s.Value): ts.Expression {

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

    case s.Value.INT64:

      const int64 = value.getInt64();
      const int64Bytes: string[] = [];

      for (let i = 0; i < 4; i++) int64Bytes.push(`0x${pad(int64.buffer[i].toString(16), 2)}`);

      const int64ByteArray = ts.createArrayLiteral(int64Bytes.map(ts.createNumericLiteral), false);
      const int64ArrayBuffer = ts.createNew(ts.createIdentifier('Uint8Array'), __, [int64ByteArray]);
      return ts.createNew(ts.createIdentifier('capnp.Int64'), __, [int64ArrayBuffer]);

    case s.Value.INT8:

      return ts.createNumericLiteral(value.getInt8().toString());

    case s.Value.TEXT:

      return ts.createLiteral(value.getText());

    case s.Value.UINT16:

      return ts.createNumericLiteral(value.getUint16().toString());

    case s.Value.UINT32:

      return ts.createNumericLiteral(value.getUint32().toString());

    case s.Value.UINT64:

      const uint64 = value.getInt64();
      const uint64Bytes: string[] = [];

      for (let i = 0; i < 4; i++) uint64Bytes.push(`0x${pad(uint64.buffer[i].toString(16), 2)}`);

      const uint64ByteArray = ts.createArrayLiteral(uint64Bytes.map(ts.createNumericLiteral), false);
      const uint64ArrayBuffer = ts.createNew(ts.createIdentifier('Uint8Array'), __, [uint64ByteArray]);
      return ts.createNew(ts.createIdentifier('capnp.Int64'), __, [uint64ArrayBuffer]);

    case s.Value.UINT8:

      return ts.createNumericLiteral(value.getUint8().toString());

    case s.Value.VOID:

      return ts.createIdentifier('undefined');

    case s.Value.ANY_POINTER:
    case s.Value.DATA:
    case s.Value.INTERFACE:
    case s.Value.LIST:
    case s.Value.STRUCT:
    default:

      throw new Error(format(E.GEN_SERIALIZE_UNKNOWN_VALUE, value.which()));

  }

}
