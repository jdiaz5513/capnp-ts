import * as capnp from 'capnp-ts';
import * as s from 'capnp-ts/lib/std/schema.capnp';
import {format} from 'capnp-ts/lib/util';
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
import {CodeGeneratorFileContext} from './code-generator-file-context';
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
  THIS,
  TS_FILE_ID,
  VALUE,
  VOID_TYPE,
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
    ctx.sourceFile.statements.push(ts.createImportDeclaration(
      __, __, ts.createImportClause(
        u as ts.Identifier, ts.createNamespaceImport(CAPNP)), ts.createLiteral(importPath)));

}

export function generateConcreteListInitializer(
  ctx: CodeGeneratorFileContext, fullClassName: string, field: s.Field): void {

    const left = ts.createPropertyAccess(ts.createIdentifier(fullClassName), `_${util.c2t(field.getName())}`);
    const right = ts.createIdentifier(getConcreteListType(ctx, field.getSlot().getType()));

    ctx.sourceFile.statements.push(ts.createStatement(ts.createAssignment(left, right)));

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
  ctx.sourceFile.statements.push(ts.createVariableStatement(
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

  ctx.sourceFile.statements.push(d);

}

export function generateFileId(ctx: CodeGeneratorFileContext): void {

  trace('generateFileId()');

  const fileId = ts.createLiteral(ctx.file.getId().toHexString());
  ctx.sourceFile.statements.push(ts.createVariableStatement(
    [EXPORT], ts.createVariableDeclarationList(
      [ts.createVariableDeclaration('_id', __, fileId)],
      ts.NodeFlags.Const)));

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

      generateStructNode(ctx, node);

      break;

    case s.Node.CONST:

      // Const nodes are generated along with the containing class, ignore these.

      break;

    case s.Node.ENUM:

      generateEnumNode(ctx, node);

      break;

    case s.Node.ANNOTATION:
    case s.Node.FILE:
    case s.Node.INTERFACE:
    default:

      throw new Error(format(E.GEN_NODE_UNKNOWN_TYPE, s.Node_Which[whichNode]));

  }

}


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
  const getPointer = ts.createCall(ts.createPropertyAccess(THIS, '_getPointer'), __, [offsetLiteral]);
  const copyFromValue = ts.createCall(ts.createPropertyAccess(getPointer, '_copyFrom'), __, [VALUE]);
  const orphanType = ts.createTypeReferenceNode('capnp.Orphan', [jsTypeReference]);
  const discriminantOffsetLiteral = ts.createNumericLiteral((discriminantOffset * 2).toString());
  const discriminantValueLiteral = ts.createNumericLiteral(discriminantValue.toString());
  const getDiscriminant = ts.createCall(
    ts.createPropertyAccess(
      THIS, '_getUint16'), __, [discriminantOffsetLiteral]);
  const setDiscriminant = ts.createCall(
    ts.createPropertyAccess(
      THIS, '_setUint16'), __, [discriminantOffsetLiteral, discriminantValueLiteral]);

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
      get = ts.createCall(ts.createPropertyAccess(THIS, '_getPointer'), __, [offsetLiteral]);
      has = true;
      set = ts.createCall(ts.createPropertyAccess(get, '_copyFrom'), __, [VALUE]);

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

      const {byteLength, getter, setter} = Primitive[whichType as number];
      // NOTE: For a BOOL type this is actually a bit offset; `byteLength` will be `1` in that case.
      const byteOffset = ts.createNumericLiteral((offset * byteLength).toString());
      const getArgs: ts.Expression[] = [byteOffset];

      if (hadExplicitDefault) getArgs.push(generateDefaultValue(ctx, fullClassName, field));

      get = ts.createCall(ts.createPropertyAccess(THIS, getter), __, getArgs);
      set = ts.createCall(ts.createPropertyAccess(THIS, setter), __, [byteOffset, VALUE]);

      break;

    case s.Type.DATA:

      if (hadExplicitDefault) throw new Error(E.GEN_EXPLICIT_DEFAULT_NON_PRIMITIVE);

      adopt = true;
      disown = true;
      get = ts.createCall(ts.createPropertyAccess(THIS, '_getData'), __, [offsetLiteral]);
      has = true;
      init = ts.createCall(ts.createPropertyAccess(THIS, '_initData'), __, [offsetLiteral, LENGTH]);
      set = copyFromValue;

      break;

    case s.Type.INTERFACE:

      if (hadExplicitDefault) throw new Error(E.GEN_EXPLICIT_DEFAULT_NON_PRIMITIVE);

      get = ts.createCall(
        ts.createPropertyAccess(
          THIS, '_getPointerAs'), __, [offsetLiteral, ts.createIdentifier(jsType)]);
      set = copyFromValue;

      break;

    case s.Type.LIST:

      if (hadExplicitDefault) throw new Error(E.GEN_EXPLICIT_DEFAULT_NON_PRIMITIVE);

      const whichElementType = field.getSlot().getType().getList().getElementType().which();
      let listClass = ConcreteListType[whichElementType];

      if (whichElementType === s.Type.LIST || whichElementType === s.Type.STRUCT) {

        listClass = `${fullClassName}._${properName}`;

      }

      adopt = true;
      disown = true;
      get = ts.createCall(
        ts.createPropertyAccess(
          THIS, '_getList'), __, [offsetLiteral, ts.createIdentifier(listClass)]);
      set = copyFromValue;

      break;

    case s.Type.STRUCT:

      if (hadExplicitDefault) throw new Error(E.GEN_EXPLICIT_DEFAULT_NON_PRIMITIVE);

      const structType = ts.createIdentifier(getJsType(ctx, field.getSlot().getType(), false));

      adopt = true;
      disown = true;
      get = ts.createCall(ts.createPropertyAccess(THIS, '_getStruct'), __, [offsetLiteral, structType]);
      has = true;
      init = ts.createCall(ts.createPropertyAccess(THIS, '_initStructAt'), __, [offsetLiteral, structType]);
      set = copyFromValue;

      break;

    case s.Type.TEXT:

      if (hadExplicitDefault) throw new Error(E.GEN_EXPLICIT_DEFAULT_NON_PRIMITIVE);

      get = ts.createCall(ts.createPropertyAccess(THIS, '_getText'), __, [offsetLiteral]);
      set = ts.createCall(ts.createPropertyAccess(THIS, '_setText'), __, [offsetLiteral, VALUE]);

      break;

    case s.Type.VOID:

      break;

    case 'group':

      if (hadExplicitDefault) throw new Error(E.GEN_EXPLICIT_DEFAULT_NON_PRIMITIVE);

      const groupType = ts.createIdentifier(jsType);

      get = ts.createCall(ts.createPropertyAccess(THIS, '_getAs'), __, [groupType]);
      init = get;

      break;

    default:

      break;

  }

  // adoptFoo(value: capnp.Orphan<FooType>): void { ... }
  if (adopt) {

    const parameters = [ts.createParameter(__, __, __, VALUE, __, orphanType, __)];
    const expressions = [ts.createCall(ts.createPropertyAccess(getPointer, 'adopt'), __, [VALUE])];

    if (union) expressions.unshift(setDiscriminant);

    members.push(createMethod(`adopt${properName}`, parameters, VOID_TYPE, expressions));

  }

  // disownFoo(): capnp.Orphan<FooType> { ... }
  if (disown) {

    const getter = ts.createCall(ts.createPropertyAccess(THIS, `get${properName}`), __, []);
    const expressions = [ts.createCall(ts.createPropertyAccess(getter, 'disown'), __, [])];

    members.push(createMethod(`disown${properName}`, [], orphanType, expressions));

  }

  // getFoo(): FooType { ... }
  if (get) {

    const expressions = [get];

    if (union) {

      expressions.unshift(ts.createCall(
        ts.createPropertyAccess(
          THIS, '_testWhich'), __, [ts.createLiteral(name), getDiscriminant, discriminantValueLiteral]));

    }

    members.push(createMethod(`get${properName}`, [], jsTypeReference, expressions));

  }


  // hasFoo(): boolean { ... }
  if (has) {

    // !this._getPointer(8)._isNull();
    const expressions = [ts.createLogicalNot(ts.createCall(ts.createPropertyAccess(getPointer, '_isNull'), __, []))];

    members.push(createMethod(`has${properName}`, [], BOOLEAN_TYPE, expressions));

  }

  // initFoo(): FooType { ... } / initFoo(length: number): capnp.List<FooElementType> { ... }
  if (init) {

    const parameters = whichType === s.Type.DATA || whichType === s.Type.LIST
      ? [ts.createParameter(__, __, __, 'length', __, NUMBER_TYPE, __)]
      : [];
    const expressions = [init];

    if (union) expressions.unshift(setDiscriminant);

    members.push(createMethod(`init${properName}`, parameters, jsTypeReference, expressions));

  }

  // isFoo(): boolean { ... }
  if (union) {

    const left = ts.createCall(ts.createPropertyAccess(THIS, '_getUint16'), __, [discriminantOffsetLiteral]);
    const right = discriminantValueLiteral;
    const expressions = [ts.createBinary(left, ts.SyntaxKind.EqualsEqualsEqualsToken, right)];

    members.push(createMethod(`is${properName}`, [], BOOLEAN_TYPE, expressions));

  }

  // setFoo(value: FooType): void { ... }
  if (set) {

    const parameters = [ts.createParameter(__, __, __, VALUE, __, jsTypeReference, __)];
    const expressions = [set];

    if (union) expressions.unshift(setDiscriminant);

    members.push(createMethod(`set${properName}`, parameters, VOID_TYPE, expressions));

  }

}

export function generateStructNode(ctx: CodeGeneratorFileContext, node: s.Node): void {

  trace('generateStructNode(%s) [%s]', node, node.getDisplayName());

  const nodeId = node.getId();
  const nodeIdHex = nodeId.toHexString();
  const struct = node.getStruct();
  const dataWordCount = struct.getDataWordCount();
  const dataByteLength = dataWordCount * 8;
  const discriminantCount = struct.getDiscriminantCount();
  const discriminantOffset = struct.getDiscriminantOffset();
  const fields = struct.getFields().toArray().sort(compareCodeOrder);
  const pointerCount = struct.getPointerCount();
  const hasUnnamedUnion = discriminantCount !== 0;
  const nestedNodes = node.getNestedNodes().map((n) => lookupNode(ctx, n)).filter((n) => !n.isConst());
  const concreteLists = fields.filter(needsConcreteListClass).sort(compareCodeOrder);
  const consts = ctx.nodes.filter((n) => n.getScopeId().equals(nodeId) && n.isConst());
  // const groups = this.nodes.filter(
  //   (n) => n.getScopeId().equals(nodeId) && n.isStruct() && n.getStruct().getIsGroup());
  const unionFields = getUnnamedUnionFields(node).sort(compareCodeOrder);
  const fullClassName = getFullClassName(node);
  const displayNamePrefix = getDisplayNamePrefix(node);

  if (hasUnnamedUnion) generateUnnamedUnionEnum(ctx, fullClassName, unionFields);

  const members: ts.ClassElement[] = [
    // static readonly CONSTANT = 'foo';
    ...consts.map(createConstProperty),
    // static readonly WHICH = MyStruct_Which.WHICH;
    ...unionFields.map((f) => createUnionConstProperty(fullClassName, f)),
    // static readonly NestedStruct = MyStruct_NestedStruct;
    ...nestedNodes.map(createNestedNodeProperty),
    // static readonly _displayName = 'MyStruct';
    ts.createProperty(__, [STATIC, READONLY], '_displayName', __, __, ts.createLiteral(displayNamePrefix)),
    // static readonly _id = '4732bab4310f81';
    ts.createProperty(__, [STATIC, READONLY], '_id', __, __, ts.createLiteral(nodeIdHex)),
    // static readonly _size: capnp.ObjectSize = new capnp.ObjectSize(8, 8);
    ts.createProperty(__, [STATIC, READONLY], '_size', __, ts.createTypeReferenceNode(
      'capnp.ObjectSize', __), ts.createNew(
        ts.createIdentifier(
          'capnp.ObjectSize'), __, [
            ts.createNumericLiteral(dataByteLength.toString()),
            ts.createNumericLiteral(pointerCount.toString())])),
    // private static _ConcreteListClass: MyStruct_ConcreteListClass;
    ...concreteLists.map((f) => createConcreteListProperty(ctx, f)),
  ];

  // getFoo() { ... } initFoo() { ... } setFoo() { ... }
  fields.forEach((f) => generateStructFieldMethods(ctx, members, node, f));

  // toString(): string { return 'MyStruct_' + super.toString(); }
  const toStringExpression = ts.createBinary(
    ts.createLiteral(`${fullClassName}_`), ts.SyntaxKind.PlusToken, ts.createCall(
      ts.createIdentifier('super.toString'), __, []));
  members.push(createMethod('toString', [], STRING_TYPE, [toStringExpression], true));

  if (hasUnnamedUnion) {

    // which(): MyStruct_Which { return this._getUint16(12); }
    const whichExpression = ts.createCall(
      ts.createPropertyAccess(
        THIS, '_getUint16'), __, [ts.createNumericLiteral((discriminantOffset * 2).toString())]);
    members.push(createMethod('which', [], ts.createTypeReferenceNode(`${fullClassName}_Which`, __),
                                          [whichExpression], true));

  }

  const c = ts.createClassDeclaration(__, [EXPORT], fullClassName, __, [createClassExtends('capnp.Struct')], members);

  ctx.sourceFile.statements.push(c);

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

    ctx.sourceFile.statements.push(d);

}
