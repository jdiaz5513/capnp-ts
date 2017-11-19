import * as capnp from 'capnp-ts';
import * as s from 'capnp-ts/lib/std/schema.capnp';
import { format } from 'capnp-ts/lib/util';
import initTrace from 'debug';
import * as ts from 'typescript';

import {
  createClassExtends,
  createConcreteListProperty,
  createConstProperty,
  createMethod,
  createNestedNodeProperty,
  createUnionConstProperty,
  createValueExpression,
} from './ast-creators';
import { CodeGeneratorFileContext } from './code-generator-file-context';
import {
  __,
  BOOLEAN_TYPE,
  CAPNP,
  ConcreteListType,
  EXPORT,
  LENGTH,
  NUMBER_TYPE,
  Primitive,
  READONLY,
  STATIC,
  STRING_TYPE,
  STRUCT,
  THIS,
  TS_FILE_ID,
  VALUE,
  VOID_TYPE,
  OBJECT_SIZE,
} from './constants';
import * as E from './errors';
import {
  compareCodeOrder,
  getConcreteListType,
  getDisplayNamePrefix,
  getFullClassName,
  getJsType,
  getUnnamedUnionFields,
  lookupNode,
  needsConcreteListClass,
} from './file';
import * as util from './util';

const trace = initTrace('capnpc:generators');
trace('load');

export function generateCapnpImport(ctx: CodeGeneratorFileContext): void {

  // Look for the special importPath annotation on the file to see if we need a different import path for capnp-ts.

  const fileNode = lookupNode(ctx, ctx.file);
  const tsFileId = capnp.Uint64.fromHexString(TS_FILE_ID);
  // This may be undefined if ts.capnp is not imported; fine, we'll just use the default.
  const tsAnnotationFile = ctx.nodes.find((n) => n.getId().equals(tsFileId));
  // We might not find the importPath annotation; that's definitely a bug but let's move on.
  const tsImportPathAnnotation = tsAnnotationFile && tsAnnotationFile.getNestedNodes().find(
    (n) => n.getName() === 'importPath');
  // There may not necessarily be an import path annotation on the file node. That's fine.
  const importAnnotation = tsImportPathAnnotation && fileNode.getAnnotations().find(
    (a) => a.getId().equals(tsImportPathAnnotation.getId()));
  const importPath = importAnnotation === undefined ? 'capnp-ts' : importAnnotation.getValue().getText();

  /* tslint:disable-next-line */
  let u: ts.Identifier | undefined;

  // import * as capnp from '${importPath}';
  ctx.statements.push(ts.createImportDeclaration(
    __, __, ts.createImportClause(
      u as ts.Identifier, ts.createNamespaceImport(CAPNP)), ts.createLiteral(importPath)));

  // import { ObjectSize as __O, Struct as __S } from '${importPath}';
  ctx.statements.push(
    ts.createStatement(ts.createIdentifier(`import { ObjectSize as __O, Struct as __S } from '${importPath}'`)));
  // ctx.statements.push(
  //   ts.createImportDeclaration(
  //     __, __, ts.createImportClause(
  //       ts.createIdentifier('ObjectSize'), ts.createNamedImports([
  //         ts.createImportSpecifier(
  //           ts.createIdentifier('ObjectSize'), ts.createIdentifier('ObjectSize'))])), ts.createLiteral(importPath)));
}

export function generateConcreteListInitializer(
  ctx: CodeGeneratorFileContext, fullClassName: string, field: s.Field): void {

  const left = ts.createPropertyAccess(ts.createIdentifier(fullClassName), `_${util.c2t(field.getName())}`);
  const right = ts.createIdentifier(getConcreteListType(ctx, field.getSlot().getType()));

  ctx.statements.push(ts.createStatement(ts.createAssignment(left, right)));

}

export function generateDefaultValue(
  ctx: CodeGeneratorFileContext, fullClassName: string, field: s.Field): ts.Expression {

  // Default values become constants in the source file that precede the class declaration.

  const name = field.getName();
  const slot = field.getSlot();
  const whichSlotType = slot.getType().which();
  const p = Primitive[whichSlotType];

  if (!p) throw new Error(E.GEN_EXPLICIT_DEFAULT_NON_PRIMITIVE);

  // MY_STRUCT_FOO_DEFAULT
  const variableName = ts.createIdentifier(util.c2s(`${fullClassName}_${name}_DEFAULT`));

  const args = [createValueExpression(slot.getDefaultValue())];
  const mask = ts.createPropertyAccess(CAPNP, p.mask);

  // BOOL types also require a bit offset to generate the default mask.
  if (whichSlotType === s.Type.BOOL) args.push(ts.createNumericLiteral((slot.getOffset() % 8).toString()));

  // export const MY_STRUCT_FOO_DEFAULT = capnp.getFloat32Mask(32.6);
  ctx.statements.push(ts.createVariableStatement(
    __, ts.createVariableDeclarationList(
      [ts.createVariableDeclaration(
        variableName, __, ts.createCall(
          mask, __, args))],
      ts.NodeFlags.Const)));

  return variableName;

}

export function generateEnumNode(ctx: CodeGeneratorFileContext, node: s.Node): void {

  trace('generateEnumNode(%s) [%s]', node, node.getDisplayName());

  const members = node.getEnum().getEnumerants().toArray().sort(compareCodeOrder).map(
    (e) => ts.createEnumMember(util.c2s(e.getName())));
  const d = ts.createEnumDeclaration(__, [EXPORT], getFullClassName(node), members);

  ctx.statements.push(d);

}

export function generateFileId(ctx: CodeGeneratorFileContext): void {

  trace('generateFileId()');

  // export const _capnpFileId = 'abcdef';
  const fileId = ts.createLiteral(ctx.file.getId().toHexString());
  ctx.statements.push(ts.createVariableStatement(
    [EXPORT], ts.createVariableDeclarationList(
      [ts.createVariableDeclaration('_capnpFileId', __, fileId)],
      ts.NodeFlags.Const)));

}

export function generateInterfaceClasses(_ctx: CodeGeneratorFileContext, node: s.Node): void {

  trace('Interface generation is not yet implemented.');

  /* tslint:disable-next-line */
  console.error(`CAPNP-TS: Warning! Interface generation (${node.getDisplayName()}) is not yet implemented.`);

}

export function generateNode(ctx: CodeGeneratorFileContext, node: s.Node): void {

  trace('generateNode(%s, %s)', ctx, node.getId().toHexString());

  const nodeId = node.getId();
  const nodeIdHex = nodeId.toHexString();

  if (ctx.generatedNodeIds.indexOf(nodeIdHex) > -1) return;

  ctx.generatedNodeIds.push(nodeIdHex);

  /** An array of group structs formed as children of this struct. They appear before the struct node in the file. */
  const groupNodes = ctx.nodes.filter(
    (n) => n.getScopeId().equals(nodeId) && n.isStruct() && n.getStruct().getIsGroup());
  /**
   * An array of nodes that are nested within this node; these must appear first since those symbols will be
   * refernced in the node's class definition.
   */
  const nestedNodes = node.getNestedNodes().map((n) => lookupNode(ctx, n));

  nestedNodes.forEach((n) => generateNode(ctx, n));
  groupNodes.forEach((n) => generateNode(ctx, n));

  const whichNode = node.which();

  switch (whichNode) {

    case s.Node.STRUCT:

      generateStructNode(ctx, node, false);

      break;

    case s.Node.CONST:

      // Const nodes are generated along with the containing class, ignore these.

      break;

    case s.Node.ENUM:

      generateEnumNode(ctx, node);

      break;

    case s.Node.INTERFACE:

      generateStructNode(ctx, node, true);

      break;

    case s.Node.ANNOTATION:
    case s.Node.FILE:
    default:

      throw new Error(format(E.GEN_NODE_UNKNOWN_TYPE, s.Node_Which[whichNode]));

  }

}

const listLengthParameterName = 'length';

export function generateStructFieldMethods(
  ctx: CodeGeneratorFileContext, members: ts.ClassElement[], node: s.Node, field: s.Field): void {

  let jsType: string;
  let whichType: s.Type_Which | string;

  if (field.isSlot()) {

    const slotType = field.getSlot().getType();
    jsType = getJsType(ctx, slotType, false);
    whichType = slotType.which();

  } else if (field.isGroup()) {

    jsType = getFullClassName(lookupNode(ctx, field.getGroup().getTypeId()));
    whichType = 'group';

  } else {

    throw new Error(format(E.GEN_UNKNOWN_STRUCT_FIELD, field.which()));

  }

  const jsTypeReference = ts.createTypeReferenceNode(jsType, __);
  const discriminantOffset = node.getStruct().getDiscriminantOffset();
  const name = field.getName();
  const properName = util.c2t(name);
  const hadExplicitDefault = field.isSlot() && field.getSlot().getHadExplicitDefault();
  const discriminantValue = field.getDiscriminantValue();
  const fullClassName = getFullClassName(node);
  const union = discriminantValue !== s.Field.NO_DISCRIMINANT;
  const offset = (field.isSlot() && field.getSlot().getOffset()) || 0;
  const offsetLiteral = ts.createNumericLiteral(offset.toString());
  /** __S.getPointer(0, this) */
  const getPointer = ts.createCall(ts.createPropertyAccess(STRUCT, 'getPointer'), __, [offsetLiteral, THIS]);
  /** __S.copyFrom(value, __S.getPointer(0, this)) */
  const copyFromValue = ts.createCall(ts.createPropertyAccess(STRUCT, 'copyFrom'), __, [VALUE, getPointer]);
  /** capnp.Orphan<Foo> */
  const orphanType = ts.createTypeReferenceNode('capnp.Orphan', [jsTypeReference]);
  const discriminantOffsetLiteral = ts.createNumericLiteral((discriminantOffset * 2).toString());
  const discriminantValueLiteral = ts.createNumericLiteral(discriminantValue.toString());
  /** __S.getUint16(0, this) */
  const getDiscriminant = ts.createCall(
    ts.createPropertyAccess(
      STRUCT, 'getUint16'), __, [discriminantOffsetLiteral, THIS]);
  /** __S.setUint16(0, this) */
  const setDiscriminant = ts.createCall(
    ts.createPropertyAccess(
      STRUCT, 'setUint16'), __, [discriminantOffsetLiteral, discriminantValueLiteral, THIS]);

  let adopt = false;
  let disown = false;
  let init;
  let has = false;
  let get;
  let set;

  switch (whichType) {

    case s.Type.ANY_POINTER:

      if (hadExplicitDefault) throw new Error(E.GEN_EXPLICIT_DEFAULT_NON_PRIMITIVE);

      adopt = true;
      disown = true;
      /** __S.getPointer(0, this) */
      get = ts.createCall(ts.createPropertyAccess(STRUCT, 'getPointer'), __, [offsetLiteral, THIS]);
      has = true;
      /** __S.copyFrom(value, __S.getPointer(0, this)) */
      set = ts.createCall(ts.createPropertyAccess(STRUCT, 'copyFrom'), __, [VALUE, get]);

      break;

    case s.Type.BOOL:
    case s.Type.ENUM:
    case s.Type.FLOAT32:
    case s.Type.FLOAT64:
    case s.Type.INT16:
    case s.Type.INT32:
    case s.Type.INT64:
    case s.Type.INT8:
    case s.Type.UINT16:
    case s.Type.UINT32:
    case s.Type.UINT64:
    case s.Type.UINT8:

      const { byteLength, getter, setter } = Primitive[whichType as number];
      // NOTE: For a BOOL type this is actually a bit offset; `byteLength` will be `1` in that case.
      const byteOffset = ts.createNumericLiteral((offset * byteLength).toString());
      const getArgs: ts.Expression[] = [byteOffset, THIS];

      if (hadExplicitDefault) getArgs.push(generateDefaultValue(ctx, fullClassName, field));

      /** __S.getXYZ(0, this) */
      get = ts.createCall(ts.createPropertyAccess(STRUCT, getter), __, getArgs);
      /** __S.setXYZ(0, value, this) */
      set = ts.createCall(ts.createPropertyAccess(STRUCT, setter), __, [byteOffset, VALUE, THIS]);

      break;

    case s.Type.DATA:

      if (hadExplicitDefault) throw new Error(E.GEN_EXPLICIT_DEFAULT_NON_PRIMITIVE);

      adopt = true;
      disown = true;
      /** __S.getData(0, this) */
      get = ts.createCall(ts.createPropertyAccess(STRUCT, 'getData'), __, [offsetLiteral, THIS]);
      has = true;
      /** __S.initData(0, length, this) */
      init = ts.createCall(ts.createPropertyAccess(STRUCT, 'initData'), __, [offsetLiteral, LENGTH, THIS]);
      set = copyFromValue;

      break;

    case s.Type.INTERFACE:

      if (hadExplicitDefault) throw new Error(E.GEN_EXPLICIT_DEFAULT_NON_PRIMITIVE);

      /** __S.getPointerAs(0, Foo, this) */
      get = ts.createCall(
        ts.createPropertyAccess(
          STRUCT, 'getPointerAs'), __, [offsetLiteral, ts.createIdentifier(jsType), THIS]);
      set = copyFromValue;

      break;

    case s.Type.LIST:

      if (hadExplicitDefault) throw new Error(E.GEN_EXPLICIT_DEFAULT_NON_PRIMITIVE);

      const whichElementType = field.getSlot().getType().getList().getElementType().which();
      let listClass = ConcreteListType[whichElementType];

      if (whichElementType === s.Type.LIST || whichElementType === s.Type.STRUCT) {

        listClass = `${fullClassName}._${properName}`;

      } else if (listClass === void (0)) {

        /* istanbul ignore next */
        throw new Error(format(E.GEN_UNSUPPORTED_LIST_ELEMENT_TYPE, whichElementType));

      }

      const listClassIdentifier = ts.createIdentifier(listClass);

      adopt = true;
      disown = true;
      /** __S.getList(0, MyStruct._Foo, this) */
      get = ts.createCall(
        ts.createPropertyAccess(STRUCT, 'getList'),
        __,
        [offsetLiteral, listClassIdentifier, THIS]);
      has = true;
      /** __S.initList(0, MyStruct._Foo, length, this) */
      init = ts.createCall(
        ts.createPropertyAccess(STRUCT, 'initList'),
        __,
        [offsetLiteral, listClassIdentifier, ts.createIdentifier(listLengthParameterName), THIS]);
      set = copyFromValue;

      break;

    case s.Type.STRUCT:

      if (hadExplicitDefault) throw new Error(E.GEN_EXPLICIT_DEFAULT_NON_PRIMITIVE);

      const structType = ts.createIdentifier(getJsType(ctx, field.getSlot().getType(), false));

      adopt = true;
      disown = true;
      /** __S.getStruct(0, Foo, this) */
      get = ts.createCall(ts.createPropertyAccess(STRUCT, 'getStruct'), __, [offsetLiteral, structType, THIS]);
      has = true;
      /** __S.initStruct(0, Foo, this) */
      init = ts.createCall(ts.createPropertyAccess(STRUCT, 'initStructAt'), __, [offsetLiteral, structType, THIS]);
      set = copyFromValue;

      break;

    case s.Type.TEXT:

      if (hadExplicitDefault) throw new Error(E.GEN_EXPLICIT_DEFAULT_NON_PRIMITIVE);

      /** __S.getText(0, this) */
      get = ts.createCall(ts.createPropertyAccess(STRUCT, 'getText'), __, [offsetLiteral, THIS]);
      /** __S.setText(0, value, this) */
      set = ts.createCall(ts.createPropertyAccess(STRUCT, 'setText'), __, [offsetLiteral, VALUE, THIS]);

      break;

    case s.Type.VOID:

      break;

    case 'group':

      if (hadExplicitDefault) throw new Error(E.GEN_EXPLICIT_DEFAULT_NON_PRIMITIVE);

      const groupType = ts.createIdentifier(jsType);

      /** __S.getAs(Foo, this); */
      get = ts.createCall(ts.createPropertyAccess(STRUCT, 'getAs'), __, [groupType, THIS]);
      init = get;

      break;

    default:

      // TODO Maybe this should be an error?

      break;

  }

  // adoptFoo(value: capnp.Orphan<Foo>): void { __S.adopt(value, this._getPointer(3)); }}
  if (adopt) {

    const parameters = [ts.createParameter(__, __, __, VALUE, __, orphanType, __)];
    const expressions = [ts.createCall(ts.createPropertyAccess(STRUCT, 'adopt'), __, [VALUE, getPointer])];

    if (union) expressions.unshift(setDiscriminant);

    members.push(createMethod(`adopt${properName}`, parameters, VOID_TYPE, expressions));

  }

  // disownFoo(): capnp.Orphan<Foo> { return __S.disown(this.getFoo()); }
  if (disown) {

    const getter = ts.createCall(ts.createPropertyAccess(THIS, `get${properName}`), __, []);
    const expressions = [ts.createCall(ts.createPropertyAccess(STRUCT, 'disown'), __, [getter])];

    members.push(createMethod(`disown${properName}`, [], orphanType, expressions));

  }

  // getFoo(): FooType { ... }
  if (get) {

    const expressions = [get];

    if (union) {

      expressions.unshift(ts.createCall(
        ts.createPropertyAccess(
          STRUCT, 'testWhich'), __, [ts.createLiteral(name), getDiscriminant, discriminantValueLiteral, THIS]));

    }

    members.push(createMethod(`get${properName}`, [], jsTypeReference, expressions));

  }


  // hasFoo(): boolean { ... }
  if (has) {

    // !__S.isNull(this._getPointer(8));
    const expressions = [
      ts.createLogicalNot(
        ts.createCall(ts.createPropertyAccess(STRUCT, 'isNull'), __, [getPointer]))];

    members.push(createMethod(`has${properName}`, [], BOOLEAN_TYPE, expressions));

  }

  // initFoo(): FooType { ... } / initFoo(length: number): capnp.List<FooElementType> { ... }
  if (init) {

    const parameters = whichType === s.Type.DATA || whichType === s.Type.LIST
      ? [ts.createParameter(__, __, __, listLengthParameterName, __, NUMBER_TYPE, __)]
      : [];
    const expressions = [init];

    if (union) expressions.unshift(setDiscriminant);

    members.push(createMethod(`init${properName}`, parameters, jsTypeReference, expressions));

  }

  // isFoo(): boolean { ... }
  if (union) {

    const left = ts.createCall(ts.createPropertyAccess(STRUCT, 'getUint16'), __, [discriminantOffsetLiteral, THIS]);
    const right = discriminantValueLiteral;
    const expressions = [ts.createBinary(left, ts.SyntaxKind.EqualsEqualsEqualsToken, right)];

    members.push(createMethod(`is${properName}`, [], BOOLEAN_TYPE, expressions));

  }

  // setFoo(value: FooType): void { ... }
  if (set || union) {

    const expressions = [];
    const parameters = [];

    if (set) {

      expressions.unshift(set);

      parameters.unshift(ts.createParameter(__, __, __, VALUE, __, jsTypeReference, __));

    }

    if (union) {

      expressions.unshift(setDiscriminant);

    }

    members.push(createMethod(`set${properName}`, parameters, VOID_TYPE, expressions));

  }

}

export function generateStructNode(ctx: CodeGeneratorFileContext, node: s.Node, interfaceNode: boolean): void {

  trace('generateStructNode(%s) [%s]', node, node.getDisplayName());

  const displayNamePrefix = getDisplayNamePrefix(node);
  const fullClassName = getFullClassName(node);
  const nestedNodes = node.getNestedNodes().map((n) => lookupNode(ctx, n)).filter((n) => !n.isConst());
  const nodeId = node.getId();
  const nodeIdHex = nodeId.toHexString();
  const struct = node.which() === s.Node.STRUCT ? node.getStruct() : undefined;
  const unionFields = getUnnamedUnionFields(node).sort(compareCodeOrder);

  const dataWordCount = struct ? struct.getDataWordCount() : 0;
  const dataByteLength = struct ? dataWordCount * 8 : 0;
  const discriminantCount = struct ? struct.getDiscriminantCount() : 0;
  const discriminantOffset = struct ? struct.getDiscriminantOffset() : 0;
  const fields = struct ? struct.getFields().toArray().sort(compareCodeOrder) : [];
  const pointerCount = struct ? struct.getPointerCount() : 0;

  const concreteLists = fields.filter(needsConcreteListClass).sort(compareCodeOrder);
  const consts = ctx.nodes.filter((n) => n.getScopeId().equals(nodeId) && n.isConst());
  // const groups = ctx.nodes.filter(
  //   (n) => n.getScopeId().equals(nodeId) && n.isStruct() && n.getStruct().getIsGroup());
  const hasUnnamedUnion = discriminantCount !== 0;

  if (hasUnnamedUnion) generateUnnamedUnionEnum(ctx, fullClassName, unionFields);

  const members: ts.ClassElement[] = [];

  // static readonly CONSTANT = 'foo';
  members.push(...consts.map(createConstProperty));

  // static readonly WHICH = MyStruct_Which.WHICH;
  members.push(...unionFields.map((f) => createUnionConstProperty(fullClassName, f)));

  // static readonly NestedStruct = MyStruct_NestedStruct;
  members.push(...nestedNodes.map(createNestedNodeProperty));

  // static readonly Client = MyInterface_Client;
  // static readonly Server = MyInterface_Server;
  // if (interfaceNode) {

  //   members.push(
  //     ts.createProperty(__, [STATIC, READONLY], 'Client', __, __, ts.createLiteral(`${fullClassName}_Client`)));
  //   members.push(
  //     ts.createProperty(__, [STATIC, READONLY], 'Server', __, __, ts.createLiteral(`${fullClassName}_Server`)));

  // }

  // static reaodnly _capnp = { displayName: 'MyStruct', id: '4732bab4310f81', size = new __O(8, 8) };
  members.push(
    ts.createProperty(
      __, [STATIC, READONLY], '_capnp', __, __,
      ts.createObjectLiteral([
        ts.createPropertyAssignment('displayName', ts.createLiteral(displayNamePrefix)),
        ts.createPropertyAssignment('id', ts.createLiteral(nodeIdHex)),
        ts.createPropertyAssignment(
          'size', ts.createNew(
            OBJECT_SIZE, __, [
              ts.createNumericLiteral(dataByteLength.toString()),
              ts.createNumericLiteral(pointerCount.toString())]))])));

  // private static _ConcreteListClass: MyStruct_ConcreteListClass;
  members.push(...concreteLists.map((f) => createConcreteListProperty(ctx, f)));

  // getFoo() { ... } initFoo() { ... } setFoo() { ... }
  fields.forEach((f) => generateStructFieldMethods(ctx, members, node, f));

  // toString(): string { return 'MyStruct_' + super.toString(); }
  const toStringExpression = ts.createBinary(
    ts.createLiteral(`${fullClassName}_`), ts.SyntaxKind.PlusToken, ts.createCall(
      ts.createIdentifier('super.toString'), __, []));
  members.push(createMethod('toString', [], STRING_TYPE, [toStringExpression], true));

  if (hasUnnamedUnion) {

    // which(): MyStruct_Which { return __S.getUint16(12, this); }
    const whichExpression = ts.createCall(
      ts.createPropertyAccess(
        STRUCT, 'getUint16'), __, [ts.createNumericLiteral((discriminantOffset * 2).toString()), THIS]);
    members.push(createMethod('which', [], ts.createTypeReferenceNode(`${fullClassName}_Which`, __),
      [whichExpression], true));

  }

  const c = ts.createClassDeclaration(__, [EXPORT], fullClassName, __, [createClassExtends('__S')], members);

  // Make sure the interface classes are generated first.

  if (interfaceNode) {

    generateInterfaceClasses(ctx, node);

  }

  ctx.statements.push(c);

  // Write out the concrete list type initializer after all the class definitions. It can't be initialized within the
  // class's static initializer because the nested type might not be defined yet.
  // FIXME: This might be solvable with topological sorting?

  ctx.concreteLists.push(...concreteLists.map<[string, s.Field]>((f) => [fullClassName, f]));

}

export function generateUnnamedUnionEnum(
  ctx: CodeGeneratorFileContext, fullClassName: string, unionFields: s.Field[]): void {

  const members = unionFields.sort(compareCodeOrder).map((f) => ts.createEnumMember(
    util.c2s(f.getName()), ts.createNumericLiteral(
      f.getDiscriminantValue().toString())));
  const d = ts.createEnumDeclaration(__, [EXPORT], `${fullClassName}_Which`, members);

  ctx.statements.push(d);

}
