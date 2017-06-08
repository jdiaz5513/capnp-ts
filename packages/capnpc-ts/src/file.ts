import * as capnp from 'capnp-ts';
import * as s from 'capnp-ts/lib/std/schema.capnp';
import {format} from 'capnp-ts/lib/util';
import initTrace from 'debug';
import * as ts from 'typescript';

import {CodeGeneratorFileContext} from './code-generator-file-context';
import {ConcreteListType} from './constants';
import * as E from './errors';
import * as util from './util';

const trace = initTrace('capnpc:file');
trace('load');

export function compareCodeOrder(a: {getCodeOrder(): number}, b: {getCodeOrder(): number}): number {

  return a.getCodeOrder() - b.getCodeOrder();

}

export function getConcreteListType(ctx: CodeGeneratorFileContext, type: s.Type): string {

  if (!type.isList()) return getJsType(ctx, type, false);

  const elementType = type.getList().getElementType();
  const elementTypeWhich = elementType.which();

  if (elementTypeWhich === s.Type.LIST) {

    return `capnp.PointerList(${getConcreteListType(ctx, elementType)})`;

  } else if (elementTypeWhich === s.Type.STRUCT) {

    const structNode = lookupNode(ctx, elementType.getStruct().getTypeId());

    if (structNode.getStruct().getPreferredListEncoding() !== s.ElementSize.INLINE_COMPOSITE) {

      throw new Error(E.GEN_FIELD_NON_INLINE_STRUCT_LIST);

    }

    return `capnp.CompositeList(${getJsType(ctx, elementType, false)})`;

  }

  return ConcreteListType[elementTypeWhich];

}

export function getDisplayNamePrefix(node: s.Node): string {

  return node.getDisplayName().substr(node.getDisplayNamePrefixLength());

}

export function getFullClassName(node: s.Node): string {

  return node.getDisplayName().split(':')[1].split('.').map(util.c2t).join('_');

}

export function getJsType(ctx: CodeGeneratorFileContext, type: s.Type, constructor: boolean): string {

  const whichType = type.which();

  switch (whichType) {

    case s.Type.ANY_POINTER:

      return 'capnp.Pointer';

    case s.Type.BOOL:

      return 'boolean';

    case s.Type.DATA:

      return 'capnp.Data';

    case s.Type.ENUM:

      return getFullClassName(lookupNode(ctx, type.getEnum().getTypeId()));

    case s.Type.FLOAT32:
    case s.Type.FLOAT64:
    case s.Type.INT16:
    case s.Type.INT32:
    case s.Type.INT8:
    case s.Type.UINT16:
    case s.Type.UINT32:
    case s.Type.UINT8:

      return 'number';

    case s.Type.INT64:

      return 'capnp.Int64';

    case s.Type.INTERFACE:

      return 'capnp.Interface';

    case s.Type.LIST:

      return `capnp.List${constructor ? 'Ctor' : ''}<${getJsType(ctx, type.getList().getElementType(), false)}>`;

    case s.Type.STRUCT:

      const c = getFullClassName(lookupNode(ctx, type.getStruct().getTypeId()));

      return constructor ? `capnp.StructCtor<${c}>` : c;

    case s.Type.UINT64:

      return 'capnp.Uint64';

    case s.Type.TEXT:

      return 'string';

    case s.Type.VOID:

      return 'void';

    default:

      throw new Error(format(E.GEN_UNKNOWN_TYPE, whichType));

  }

}

export function getUnnamedUnionFields(node: s.Node): s.Field[] {

  if (!node.isStruct()) return [];

  return node.getStruct().getFields().filter((f) => f.getDiscriminantValue() !== s.Field.NO_DISCRIMINANT);

}

export function loadRequestedFile(
  req: s.CodeGeneratorRequest, file: s.CodeGeneratorRequest_RequestedFile): CodeGeneratorFileContext {

  trace('compile(%s, %s)', req, file);

  const ctx = new CodeGeneratorFileContext();
  const filename = file.getFilename();

  ctx.req = req;
  ctx.file = file;
  ctx.nodes = req.getNodes().toArray();
  ctx.tsPath = filename + '.ts';
  ctx.jsPath = filename + '.js';
  ctx.sourceMapPath = filename + '.js.map';
  ctx.sourceFile = ts.createSourceFile(ctx.tsPath, '', ts.ScriptTarget.Latest, false, ts.ScriptKind.TS);
  ctx.concreteLists = [];
  ctx.generatedNodeIds = [];

  return ctx;

}

export function lookupNode(ctx: CodeGeneratorFileContext, lookup: {getId(): capnp.Uint64} | capnp.Uint64): s.Node {

  const id = lookup instanceof capnp.Uint64 ? lookup : lookup.getId();
  const node = ctx.nodes.find((n) => n.getId().equals(id));

  if (node === undefined) throw new Error(format(E.GEN_NODE_LOOKUP_FAIL, id));

  return node;

}

/**
 * Determine whether the given field needs a concrete list class: this is currently the case for composite lists
 * (`capnp.CompositeList`) and lists of lists (`capnp.PointerList`).
 *
 * @param {s.Field} field The field to check.
 * @returns {boolean} Returns `true` if the field requires a concrete list class initializer.
 */

export function needsConcreteListClass(field: s.Field): boolean {

  if (!field.isSlot()) return false;

  const slotType = field.getSlot().getType();

  if (!slotType.isList()) return false;

  const elementType = slotType.getList().getElementType();

  return elementType.isStruct() || elementType.isList();

}
