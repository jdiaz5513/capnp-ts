import * as s from "capnp-ts/src/std/schema.capnp.js";
import { format } from "capnp-ts/src/util";
import initTrace from "debug";

import { CodeGeneratorFileContext } from "./code-generator-file-context";
import { ConcreteListType, Primitive, TS_FILE_ID } from "./constants";
import * as E from "./errors";
import {
  compareCodeOrder,
  genericArgNames,
  genericParamDecl,
  genericParams,
  GenericParam,
  getConcreteListType,
  getDisplayNamePrefix,
  getFullClassName,
  getJsType,
  getUnnamedUnionFields,
  hasNode,
  lookupNode,
  needsConcreteListClass,
  parameterRef,
  resolveBrand,
} from "./file";
import * as util from "./util";
import { enumDecl, indent, klass, method, str } from "./text";
import { createValueExpression } from "./values";

const trace = initTrace("capnpc:generators");
trace("load");

export function generateCapnpImport(ctx: CodeGeneratorFileContext): void {
  const fileNode = lookupNode(ctx, ctx.file);
  const tsFileId = util.hexToBigInt(TS_FILE_ID);
  const tsAnnotationFile = ctx.nodes.find((n) => n.getId() === tsFileId);
  const tsImportPathAnnotation =
    tsAnnotationFile && tsAnnotationFile.getNestedNodes().find((n) => n.getName() === "importPath");
  const importAnnotation =
    tsImportPathAnnotation && fileNode.getAnnotations().find((a) => a.getId() === tsImportPathAnnotation.getId());
  const importPath = importAnnotation === undefined ? "capnp-ts" : importAnnotation.getValue().getText();

  ctx.sourceParts.push(`import * as capnp from ${str(importPath)};`);
  ctx.sourceParts.push(`import { ObjectSize as __O, Struct as __S } from '${importPath}';`);
}

export function generateConcreteListInitializer(
  ctx: CodeGeneratorFileContext,
  fullClassName: string,
  field: s.Field,
): void {
  ctx.sourceParts.push(
    `${fullClassName}._${util.c2t(field.getName())} = ${getConcreteListType(ctx, field.getSlot().getType())};`,
  );
}

export function generateConstNode(ctx: CodeGeneratorFileContext, node: s.Node): void {
  const constNode = node.getConst();
  const name = getDisplayNamePrefix(node);
  const value = createValueExpression(constNode.getValue());

  // Pointer-typed constants are emitted as functions so the class wrapping the raw bytes is not resolved until the
  // constant is first used; a module-scope value could observe partially-initialized imports in a dependency cycle.

  switch (constNode.getType().which()) {
    case s.Type.DATA:
      ctx.sourceParts.push(`export function get${util.c2t(name)}(): capnp.Data {
    return capnp.Data.fromPointer(${value});
}`);

      break;

    case s.Type.LIST: {
      const listClass = getConcreteListType(ctx, constNode.getType());
      const jsType = getJsType(ctx, constNode.getType(), false);
      ctx.sourceParts.push(`export function get${util.c2t(name)}(): ${jsType} {
    const p = ${value};
    return new (${listClass})(p.segment, p.byteOffset);
}`);

      break;
    }

    case s.Type.STRUCT: {
      const structClass = getJsType(ctx, constNode.getType(), false);
      ctx.sourceParts.push(`export function get${util.c2t(name)}(): ${structClass} {
    const p = ${value};
    return new ${structClass}(p.segment, p.byteOffset);
}`);

      break;
    }

    default:
      ctx.sourceParts.push(`export const ${name} = ${value};`);
  }
}

export function generateDefaultValue(field: s.Field): string {
  const name = field.getName();
  const slot = field.getSlot();
  const whichSlotType = slot.getType().which();
  const p = Primitive[whichSlotType];
  let initializer: string;

  switch (whichSlotType) {
    case s.Type_Which.ANY_POINTER:
    case s.Type_Which.DATA:
    case s.Type_Which.LIST:
    case s.Type_Which.STRUCT:
      initializer = createValueExpression(slot.getDefaultValue());

      break;

    case s.Type_Which.TEXT:
      initializer = str(slot.getDefaultValue().getText());

      break;

    case s.Type_Which.BOOL:
      initializer = `capnp.${p.mask}(${createValueExpression(slot.getDefaultValue())}, ${slot.getOffset() % 8})`;

      break;

    case s.Type_Which.ENUM:
    case s.Type_Which.FLOAT32:
    case s.Type_Which.FLOAT64:
    case s.Type_Which.INT16:
    case s.Type_Which.INT32:
    case s.Type_Which.INT64:
    case s.Type_Which.INT8:
    case s.Type_Which.UINT16:
    case s.Type_Which.UINT32:
    case s.Type_Which.UINT64:
    case s.Type_Which.UINT8:
      initializer = `capnp.${p.mask}(${createValueExpression(slot.getDefaultValue())})`;

      break;

    default:
      throw new Error(format(E.GEN_UNKNOWN_DEFAULT, s.Type_Which[whichSlotType]));
  }

  return `default${util.c2t(name)}: ${initializer}`;
}

export function generateEnumNode(ctx: CodeGeneratorFileContext, node: s.Node): void {
  trace("generateEnumNode(%s) [%s]", node, node.getDisplayName());

  const members = node
    .getEnum()
    .getEnumerants()
    .toArray()
    .sort(compareCodeOrder)
    .map((e) => ({ name: util.c2s(e.getName()) }));

  ctx.sourceParts.push(enumDecl(getFullClassName(node), members));
}

export function generateFileId(ctx: CodeGeneratorFileContext): void {
  trace("generateFileId()");

  ctx.sourceParts.push(`export const _capnpFileId = BigInt(${str(`0x${ctx.file.getId().toString(16)}`)});`);
}

export function generateInterfaceClasses(ctx: CodeGeneratorFileContext, node: s.Node): void {
  trace("generateInterfaceClasses(%s) [%s]", node, node.getDisplayName());

  const fullClassName = getFullClassName(node);
  const gparams = genericParams(ctx, node);
  // The method list index IS the method id; do not reorder.
  const methods = node.getInterface().getMethods().toArray();

  methods.forEach((m) => {
    ctx.implicitScopes.set(m.getParamStructType().toString(), gparams);
    ctx.implicitScopes.set(m.getResultStructType().toString(), gparams);
    generateNode(ctx, lookupNode(ctx, m.getParamStructType()));
    generateNode(ctx, lookupNode(ctx, m.getResultStructType()));
  });

  methods.forEach((m) => generateResultPromise(ctx, node, m));
  generateInterfaceClient(ctx, node, fullClassName, methods, gparams);
  generateInterfaceServer(ctx, fullClassName, methods, gparams);
  const decl = genericParamDecl(gparams);
  const args = genericArgNames(gparams);
  ctx.sourceParts.push(
    `export type ${fullClassName}_Ref${decl} = ${fullClassName}_Client${args} | ${fullClassName}_Server${args};`,
  );
}

function generateInterfaceClient(
  ctx: CodeGeneratorFileContext,
  node: s.Node,
  fullClassName: string,
  methods: s.Method[],
  gparams: GenericParam[],
): void {
  const interfaceId = `BigInt(${str(`0x${node.getId().toString(16)}`)})`;
  const generic = gparams.length > 0;
  const args = genericArgNames(gparams);
  const members: string[] = [];

  members.push(`static readonly interfaceId: bigint = ${interfaceId};`);

  const methodTypes = (bound: boolean) =>
    methods.map(
      (m) =>
        `capnp.Method<${getFullClassName(lookupNode(ctx, m.getParamStructType()))}${bound ? args : ""}, ` +
        `${getFullClassName(lookupNode(ctx, m.getResultStructType()))}${bound ? args : ""}>`,
    );
  const methodDefs = methods.map((m, i) => {
    const paramsClass = getFullClassName(lookupNode(ctx, m.getParamStructType()));
    const resultsClass = getFullClassName(lookupNode(ctx, m.getResultStructType()));

    return (
      `{\n` +
      indent(
        [
          `interfaceId: ${interfaceId},`,
          `interfaceName: ${str(node.getDisplayName())},`,
          `methodId: ${i},`,
          `methodName: ${str(m.getName())},`,
          `ParamsClass: ${paramsClass},`,
          `ResultsClass: ${resultsClass},`,
        ].join("\n"),
      ) +
      `\n}`
    );
  });

  if (methods.length === 0) {
    members.push(`static readonly methods: [] = [];`);
    members.push(`readonly client: capnp.Client;`);
    members.push(`constructor(client: capnp.Client) { this.client = client; }`);
  } else if (!generic) {
    members.push(
      `static readonly methods: [\n${indent(methodTypes(false).join(",\n"))}\n] = [\n${indent(
        methodDefs.join(",\n"),
      )}\n];`,
    );
    members.push(`readonly client: capnp.Client;`);
    members.push(`constructor(client: capnp.Client) { this.client = client; }`);
  } else {
    const bindingsTuple = `[${gparams.map((p) => `capnp.StructCtor<${p.name}>`).join(", ")}]`;
    const boundDefs = methods.map((m, i) => {
      const paramsClass = getFullClassName(lookupNode(ctx, m.getParamStructType()));
      const resultsClass = getFullClassName(lookupNode(ctx, m.getResultStructType()));
      return (
        `{ ...${fullClassName}_Methods[${i}], ` +
        `ParamsClass: capnp.bindGeneric(${paramsClass}${args}, bindings), ` +
        `ResultsClass: capnp.bindGeneric(${resultsClass}${args}, bindings) }`
      );
    });
    members.push(`readonly bindings: ${bindingsTuple};`);
    members.push(`readonly client: capnp.Client;`);
    members.push(`readonly methods: [\n${indent(methodTypes(true).join(",\n"))}\n];`);
    members.push(
      `constructor(client: capnp.Client, bindings: ${bindingsTuple}) {\n` +
        indent(
          [
            `this.client = client;`,
            `this.bindings = bindings;`,
            `this.methods = [\n${indent(boundDefs.join(",\n"))}\n];`,
          ].join("\n"),
        ) +
        `\n}`,
    );
  }

  methods.forEach((m, i) => {
    const paramsClass = getFullClassName(lookupNode(ctx, m.getParamStructType()));
    const resultsNode = lookupNode(ctx, m.getResultStructType());
    const resultsClass = getFullClassName(resultsNode);
    const promiseName = resultPromiseName(ctx, node, m);
    const boundArgs = generic ? args : "";
    const returnType = promiseName ?? `capnp.RemotePromise<${resultsClass}${boundArgs}>`;
    const table = generic ? `this.methods` : `${fullClassName}_Client.methods`;
    const callArgs =
      promiseName === null ? `${table}[${i}], params` : `${table}[${i}], params, ${promiseName}`;

    members.push(
      method(
        m.getName(),
        [`params?: ((params: ${paramsClass}${boundArgs}) => void) | ${paramsClass}_Shape`],
        returnType,
        [`this.client.call(${callArgs})`],
      ),
    );
  });

  members.push(method("dispose", [], "void", ["this.client.dispose()"]));
  members.push(`[Symbol.dispose](): void { this.client.dispose(); }`);

  if (generic && methods.length > 0) {
    ctx.sourceParts.push(
      `const ${fullClassName}_Methods: [\n${indent(methodTypes(false).join(",\n"))}\n] = [\n${indent(
        methodDefs.join(",\n"),
      )}\n];`,
    );
  }
  ctx.sourceParts.push(
    `export class ${fullClassName}_Client${genericParamDecl(gparams)} {\n${members.map(indent).join("\n")}\n}`,
  );
}

function generateInterfaceServer(
  ctx: CodeGeneratorFileContext,
  fullClassName: string,
  methods: s.Method[],
  gparams: GenericParam[],
): void {
  const generic = gparams.length > 0;
  const decl = genericParamDecl(gparams);
  const args = genericArgNames(gparams);
  const boundArgs = generic ? args : "";

  const targetMembers = methods.map(
    (m) =>
      `${m.getName()}: capnp.ServerMethodImpl<${getFullClassName(lookupNode(ctx, m.getParamStructType()))}${boundArgs}, ` +
      `${getFullClassName(lookupNode(ctx, m.getResultStructType()))}${boundArgs}>;`,
  );

  ctx.sourceParts.push(
    `export interface ${fullClassName}_ServerTarget${decl} {\n${targetMembers.map(indent).join("\n")}\n}`,
  );

  const table = generic ? `${fullClassName}_Methods` : `${fullClassName}_Client.methods`;
  // Generic servers re-bind their table rows so dispatch constructs
  // params/results through the bound ctors — impls get typed instances.
  // Bindings are optional: an unbound server still dispatches, its
  // impls just read parameter fields via explicit ctors.
  const rows = methods.map((m, i) => {
    if (!generic) return `{ ...${table}[${i}], impl: target.${m.getName()} },`;
    const paramsClass = getFullClassName(lookupNode(ctx, m.getParamStructType()));
    const resultsClass = getFullClassName(lookupNode(ctx, m.getResultStructType()));
    return (
      `{ ...${table}[${i}], ...(bindings === undefined ? {} : { ` +
      `ParamsClass: capnp.bindGeneric(${paramsClass}, bindings), ` +
      `ResultsClass: capnp.bindGeneric(${resultsClass}, bindings) }), ` +
      `impl: target.${m.getName()} },`
    );
  });
  const bindingsTuple = generic
    ? `[${gparams.map((p) => `capnp.StructCtor<${p.name}>`).join(", ")}]`
    : "";
  const ctorParams = generic
    ? `target: ${fullClassName}_ServerTarget${args}, bindings?: ${bindingsTuple}`
    : `target: ${fullClassName}_ServerTarget`;
  const ctor =
    methods.length === 0
      ? `constructor(_target: ${fullClassName}_ServerTarget) { super([]); }`
      : `constructor(${ctorParams}) {\n${indent(
          `super([\n${indent(rows.join("\n"))}\n]);`,
        )}\n}`;

  ctx.sourceParts.push(
    `export class ${fullClassName}_Server${decl} extends capnp.Server {\n${indent(ctor)}\n}`,
  );
}

/** Emit a pipelined RemotePromise subclass for a method whose results carry capabilities. */

function generateResultPromise(ctx: CodeGeneratorFileContext, node: s.Node, m: s.Method): void {
  const promiseName = resultPromiseName(ctx, node, m);

  if (promiseName === null) return;

  const resultsNode = lookupNode(ctx, m.getResultStructType());
  const resultsClass = getFullClassName(resultsNode);
  const env = genericParams(ctx, resultsNode);
  const accessors = interfaceFields(resultsNode).map((f) => {
    const iface = f.getSlot().getType().getInterface();
    const ifaceClient = `${getFullClassName(lookupNode(ctx, iface.getTypeId()))}_Client`;
    const bound = resolveBrand(ctx, iface.getTypeId(), iface.getBrand(), env);
    const args = bound === null ? "" : `<${bound.map((b) => b.typeArg).join(", ")}>`;
    const ctors = bound === null ? "" : `, [${bound.map((b) => b.ctorExpr).join(", ")}]`;

    return method(`get${util.c2t(f.getName())}`, [], `${ifaceClient}${args}`, [
      `new ${ifaceClient}${args}(this.pipelineClient(${f.getSlot().getOffset()})${ctors})`,
    ]);
  });

  ctx.sourceParts.push(
    `export class ${promiseName} extends capnp.RemotePromise<${resultsClass}> {\n${accessors
      .map(indent)
      .join("\n")}\n}`,
  );
}

/** Capability-typed fields of a struct node. */

function interfaceFields(node: s.Node): s.Field[] {
  if (!node.isStruct()) return [];

  return node
    .getStruct()
    .getFields()
    .toArray()
    .filter((f) => f.isSlot() && f.getSlot().getType().which() === s.Type.INTERFACE);
}

/** The name of the method's pipelined promise class, or null if it needs none. */

function resultPromiseName(ctx: CodeGeneratorFileContext, node: s.Node, m: s.Method): string | null {
  if (interfaceFields(lookupNode(ctx, m.getResultStructType())).length === 0) return null;

  return `${getFullClassName(node)}_${util.c2t(m.getName())}$Promise`;
}

export function generateNestedImports(ctx: CodeGeneratorFileContext): void {
  ctx.imports.forEach((i) => {
    const name = i.getName();
    let importPath: string;

    if (name.substr(0, 7) === "/capnp/") {
      importPath = `capnp-ts/src/std/${name.substr(7)}.js`;
    } else {
      importPath = name[0] === "." ? `${name}.js` : `./${name}.js`;
    }

    const imports = getImportNodes(ctx, lookupNode(ctx, i))
      .map((n) => {
        const c = getFullClassName(n);

        // Struct shapes come along for cross-file struct fields;
        // interfaces bring their client/server/ref surface.
        if (n.isStruct()) return `${c}, ${c}_Shape, ${c}_Json`;
        if (n.isInterface()) return `${c}, ${c}_Client, ${c}_Server, ${c}_Ref`;
        return c;
      })
      .join(", ");

    if (imports.length < 1) return;

    const importStatement = `import { ${imports} } from "${importPath}"`;

    trace("emitting import statement:", importStatement);
    ctx.sourceParts.push(`${importStatement};`);
  });
}

export function generateNode(ctx: CodeGeneratorFileContext, node: s.Node): void {
  trace("generateNode(%s, %s)", ctx, node.getId().toString(16));

  const nodeId = node.getId();
  const nodeIdHex = nodeId.toString(16);

  if (ctx.generatedNodeIds.indexOf(nodeIdHex) > -1) return;

  ctx.generatedNodeIds.push(nodeIdHex);

  /** An array of group structs formed as children of this struct. They appear before the struct node in the file. */
  const groupNodes = ctx.nodes.filter((n) => n.getScopeId() === nodeId && n.isStruct() && n.getStruct().getIsGroup());
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
      // Struct-scoped consts are generated as statics along with the containing class; file-scoped consts have no
      // containing class and are emitted at module scope.

      if (node.getScopeId() === ctx.file.getId()) generateConstNode(ctx, node);

      break;

    case s.Node.ENUM:
      generateEnumNode(ctx, node);

      break;

    case s.Node.INTERFACE:
      generateStructNode(ctx, node, true);

      break;

    case s.Node.ANNOTATION:
      trace("ignoring unsupported annotation node: %s", node.getDisplayName());

      break;

    case s.Node.FILE:
    default:
      throw new Error(format(E.GEN_NODE_UNKNOWN_TYPE, s.Node_Which[whichNode]));
  }
}

const listLengthParameterName = "length";

/** Base-class and generated member names that field properties must not shadow. */
const RESERVED_PROPERTY_NAMES = new Set([
  "_capnp",
  "byteOffset",
  "constructor",
  "get",
  "segment",
  "set",
  "toJSON",
  "toString",
  "which",
]);

export function generateStructFieldMethods(
  ctx: CodeGeneratorFileContext,
  members: string[],
  node: s.Node,
  field: s.Field,
): void {
  let jsType: string;
  let whichType: s.Type_Which | string;

  if (field.isSlot()) {
    const slotType = field.getSlot().getType();
    jsType = getJsType(ctx, slotType, false);
    whichType = slotType.which();
  } else if (field.isGroup()) {
    jsType = getFullClassName(lookupNode(ctx, field.getGroup().getTypeId()));
    whichType = "group";
  } else {
    throw new Error(format(E.GEN_UNKNOWN_STRUCT_FIELD, field.which()));
  }

  const discriminantOffset = node.getStruct().getDiscriminantOffset();
  const name = field.getName();
  const properName = util.c2t(name);
  const hadExplicitDefault = field.isSlot() && field.getSlot().getHadExplicitDefault();
  const discriminantValue = field.getDiscriminantValue();
  const fullClassName = getFullClassName(node);
  const union = discriminantValue !== s.Field.NO_DISCRIMINANT;
  const offset = (field.isSlot() && field.getSlot().getOffset()) || 0;
  /** __S.getPointer(0, this) */
  const getPointer = `__S.getPointer(${offset}, this)`;
  /** __S.copyFrom(value, __S.getPointer(0, this)) */
  const copyFromValue = `__S.copyFrom(value, ${getPointer})`;
  /** capnp.Orphan<Foo> */
  const orphanType = `capnp.Orphan<${jsType}>`;
  const discriminantOffsetLiteral = `${discriminantOffset * 2}`;
  const discriminantValueLiteral = `${discriminantValue}`;
  /** __S.getUint16(0, this) */
  const getDiscriminant = `__S.getUint16(${discriminantOffsetLiteral}, this)`;
  /** __S.setUint16(0, 1, this) */
  const setDiscriminant = `__S.setUint16(${discriminantOffsetLiteral}, ${discriminantValueLiteral}, this)`;
  const defaultValue = hadExplicitDefault ? `${fullClassName}._capnp.default${properName}` : undefined;

  const gparams = genericParams(ctx, node);
  if (field.isSlot()) {
    const pref = parameterRef(field.getSlot().getType(), gparams);
    if (pref !== undefined) {
      const t = pref.name;
      const rDecl = `<R extends capnp.Struct = ${t}>`;
      const ctorExpr = `capnp.getGenericBinding<R>(this, ${pref.flatIndex}, ctor)`;
      const guard = union
        ? [`__S.testWhich(${str(name)}, ${getDiscriminant}, ${discriminantValueLiteral}, this)`]
        : [];
      const arm = union ? [setDiscriminant] : [];
      members.push(
        method(`adopt${properName}`, [`value: capnp.Orphan<capnp.Pointer>`], "void", [
          ...arm,
          `__S.adopt(value, ${getPointer})`,
        ]),
      );
      members.push(
        method(`disown${properName}`, [], `capnp.Orphan<capnp.Pointer>`, [
          `__S.disown(${getPointer})`,
        ]),
      );
      members.push(
        method(`get${properName}${rDecl}`, [`ctor?: capnp.StructCtor<R>`], "R", [
          ...guard,
          `__S.getStruct(${offset}, ${ctorExpr}, this)`,
        ]),
      );
      members.push(method(`has${properName}`, [], "boolean", [`!__S.isNull(${getPointer})`]));
      members.push(
        method(`init${properName}${rDecl}`, [`ctor?: capnp.StructCtor<R>`], "R", [
          ...arm,
          `__S.initStructAt(${offset}, ${ctorExpr}, this)`,
        ]),
      );
      if (union) {
        members.push(
          method(`is${properName}`, [], "boolean", [
            `${getDiscriminant} === ${discriminantValueLiteral}`,
          ]),
        );
      }
      members.push(
        method(`set${properName}`, [`value: ${t}`], "void", [
          ...arm,
          `__S.copyFrom(value, ${getPointer})`,
        ]),
      );
      members.push(`get ${name}(): ${t} { return this.get${properName}(); }`);
      members.push(`set ${name}(value: ${t}) { this.set${properName}(value); }`);
      return;
    }
  }

  let adopt = false;
  let disown = false;
  let init: string | undefined;
  let has = false;
  let get: string | undefined;
  let set: string | undefined;
  /** Overrides the setter's parameter type when it differs from the getter's return type. */
  let setType: string | undefined;
  let getArgs: string[];
  let setArgs: string[];

  switch (whichType) {
    case s.Type.ANY_POINTER:
      getArgs = [`${offset}`, "this"];

      if (defaultValue) getArgs.push(defaultValue);

      adopt = true;
      disown = true;
      /** __S.getPointer(0, this) */
      get = `__S.getPointer(${getArgs.join(", ")})`;
      has = true;
      /** __S.copyFrom(value, __S.getPointer(0, this)) */
      set = `__S.copyFrom(value, ${get})`;

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
    case s.Type.UINT8: {
      const { byteLength, getter, setter } = Primitive[whichType as number];
      // NOTE: For a BOOL type this is actually a bit offset; `byteLength` will be `1` in that case.
      const byteOffset = `${offset * byteLength}`;
      getArgs = [byteOffset, "this"];
      setArgs = [byteOffset, "value", "this"];

      if (defaultValue) {
        getArgs.push(defaultValue);
        setArgs.push(defaultValue);
      }

      /** __S.getXYZ(0, this) */
      get = `__S.${getter}(${getArgs.join(", ")})`;
      /** __S.setXYZ(0, value, this) */
      set = `__S.${setter}(${setArgs.join(", ")})`;

      break;
    }
    case s.Type.DATA:
      getArgs = [`${offset}`, "this"];

      if (defaultValue) getArgs.push(defaultValue);

      adopt = true;
      disown = true;
      /** __S.getData(0, this) */
      get = `__S.getData(${getArgs.join(", ")})`;
      has = true;
      /** __S.initData(0, length, this) */
      init = `__S.initData(${offset}, ${listLengthParameterName}, this)`;
      set = copyFromValue;

      break;

    case s.Type.INTERFACE: {
      // An explicit default on a capability field can only be null; ignore it.
      const iface = field.getSlot().getType().getInterface();
      const ifaceName = getFullClassName(lookupNode(ctx, iface.getTypeId()));
      const bound = resolveBrand(ctx, iface.getTypeId(), iface.getBrand(), gparams);
      const args = bound === null ? "" : `<${bound.map((b) => b.typeArg).join(", ")}>`;
      const ctors =
        bound === null ? "" : `, [${bound.map((b) => b.ctorExpr).join(", ")}]`;

      jsType = `${ifaceName}_Client${args}`;
      /** new Foo_Client(capnp.getInterfaceClient(0, this), [Bindings]) */
      get = `new ${ifaceName}_Client${args}(capnp.getInterfaceClient(${offset}, this)${ctors})`;
      setType = `${ifaceName}_Ref${args}`;
      /** capnp.setInterfaceClient(0, value, this) */
      set = `capnp.setInterfaceClient(${offset}, value, this)`;

      break;
    }

    case s.Type.LIST: {
      const whichElementType = field.getSlot().getType().getList().getElementType().which();
      let listClass = ConcreteListType[whichElementType];

      if (whichElementType === s.Type.LIST || whichElementType === s.Type.STRUCT) {
        listClass = `${fullClassName}._${properName}`;
      } else if (listClass === void 0) {
        /* istanbul ignore next */
        throw new Error(format(E.GEN_UNSUPPORTED_LIST_ELEMENT_TYPE, whichElementType));
      }

      getArgs = [`${offset}`, listClass, "this"];

      if (defaultValue) getArgs.push(defaultValue);

      adopt = true;
      disown = true;
      /** __S.getList(0, MyStruct._Foo, this) */
      get = `__S.getList(${getArgs.join(", ")})`;
      has = true;
      /** __S.initList(0, MyStruct._Foo, length, this) */
      init = `__S.initList(${offset}, ${listClass}, ${listLengthParameterName}, this)`;
      set = copyFromValue;

      break;
    }
    case s.Type.STRUCT: {
      let structType = getJsType(ctx, field.getSlot().getType(), false);
      {
        const st = field.getSlot().getType().getStruct();
        const bound = resolveBrand(ctx, st.getTypeId(), st.getBrand(), gparams);
        if (bound !== null) {
          jsType = `${structType}<${bound.map((b) => b.typeArg).join(", ")}>`;
          structType = `capnp.bindGeneric(${jsType}, [${bound
            .map((b) => b.ctorExpr)
            .join(", ")}])`;
        }
      }

      getArgs = [`${offset}`, structType, "this"];

      if (defaultValue) getArgs.push(defaultValue);

      adopt = true;
      disown = true;
      /** __S.getStruct(0, Foo, this) */
      get = `__S.getStruct(${getArgs.join(", ")})`;
      has = true;
      /** __S.initStructAt(0, Foo, this) */
      init = `__S.initStructAt(${offset}, ${structType}, this)`;
      set = copyFromValue;

      break;
    }
    case s.Type.TEXT:
      getArgs = [`${offset}`, "this"];

      if (defaultValue) getArgs.push(defaultValue);

      /** __S.getText(0, this) */
      get = `__S.getText(${getArgs.join(", ")})`;
      /** __S.setText(0, value, this) */
      set = `__S.setText(${offset}, value, this)`;

      break;

    case s.Type.VOID:
      break;

    case "group": {
      if (hadExplicitDefault) {
        throw new Error(format(E.GEN_EXPLICIT_DEFAULT_NON_PRIMITIVE, "group"));
      }

      /** __S.getAs(Foo, this); */
      get = `__S.getAs(${jsType}, this)`;
      init = get;

      break;
    }
    default:
      // TODO Maybe this should be an error?

      break;
  }

  // adoptFoo(value: capnp.Orphan<Foo>): void { __S.adopt(value, __S.getPointer(3, this)); }
  if (adopt) {
    const expressions = [`__S.adopt(value, ${getPointer})`];

    if (union) expressions.unshift(setDiscriminant);

    members.push(method(`adopt${properName}`, [`value: ${orphanType}`], "void", expressions));
  }

  // disownFoo(): capnp.Orphan<Foo> { return __S.disown(this.getFoo()); }
  if (disown) {
    members.push(method(`disown${properName}`, [], orphanType, [`__S.disown(this.get${properName}())`]));
  }

  // getFoo(): FooType { ... }
  if (get) {
    const expressions = [get];

    if (union) {
      expressions.unshift(`__S.testWhich(${str(name)}, ${getDiscriminant}, ${discriminantValueLiteral}, this)`);
    }

    members.push(method(`get${properName}`, [], jsType, expressions));
  }

  // hasFoo(): boolean { ... }
  if (has) {
    // !__S.isNull(this._getPointer(8));
    members.push(method(`has${properName}`, [], "boolean", [`!__S.isNull(${getPointer})`]));
  }

  // initFoo(): FooType { ... } / initFoo(length: number): capnp.List<FooElementType> { ... }
  if (init) {
    const parameters =
      whichType === s.Type.DATA || whichType === s.Type.LIST ? [`${listLengthParameterName}: number`] : [];
    const expressions = [init];

    if (union) expressions.unshift(setDiscriminant);

    members.push(method(`init${properName}`, parameters, jsType, expressions));
  }

  // isFoo(): boolean { ... }
  if (union) {
    members.push(method(`is${properName}`, [], "boolean", [`${getDiscriminant} === ${discriminantValueLiteral}`]));
  }

  // setFoo(value: FooType): void { ... }
  if (set || union) {
    const expressions = [];
    const parameters = [];

    if (set) {
      expressions.unshift(set);

      parameters.unshift(`value: ${setType ?? jsType}`);
    }

    if (union) {
      expressions.unshift(setDiscriminant);
    }

    members.push(method(`set${properName}`, parameters, "void", expressions));
  }

  generateFieldProperties(ctx, members, field, name, properName, whichType, jsType, setType);
}

/**
 * Emit `.foo` accessor pairs mirroring the get/set methods. The methods remain the
 * primitive surface (multi-arg init, adopt/disown); properties add liberal setters:
 * struct fields accept shapes, list fields accept arrays, Data accepts
 * Uint8Array/base64, and 64-bit integers accept bigint|number|string.
 */

function generateFieldProperties(
  ctx: CodeGeneratorFileContext,
  members: string[],
  field: s.Field,
  name: string,
  properName: string,
  whichType: s.Type_Which | string,
  jsType: string,
  setType: string | undefined,
): void {
  if (RESERVED_PROPERTY_NAMES.has(name)) return;

  if (whichType === "group") {
    members.push(`get ${name}(): ${jsType} { return this.get${properName}(); }`);
    members.push(`set ${name}(value: ${jsType}_Shape) { this.init${properName}().set(value); }`);
    return;
  }

  switch (whichType) {
    case s.Type.VOID:
      return;

    case s.Type.INT64:
    case s.Type.UINT64:
      members.push(`get ${name}(): bigint { return this.get${properName}(); }`);
      members.push(`set ${name}(value: bigint | number | string) { this.set${properName}(BigInt(value)); }`);
      return;

    case s.Type.STRUCT: {
      // Branded generic fields carry type args in jsType; the Shape
      // interface and the runtime instanceof both want the base class.
      const base = jsType.split("<")[0];
      members.push(`get ${name}(): ${jsType} { return this.get${properName}(); }`);
      members.push(
        `set ${name}(value: ${jsType} | ${base}_Shape) { if (value instanceof ${base}) { this.set${properName}(value); } else { this.init${properName}().set(value); } }`,
      );
      return;
    }

    case s.Type.LIST: {
      members.push(`get ${name}(): ${jsType} { return this.get${properName}(); }`);

      const shaped = shapeListField(ctx, field, name, properName, false, `value.${name}`);

      members.push(
        shaped === null
          ? `set ${name}(value: ${jsType}) { this.set${properName}(value); }`
          : `set ${name}(value: ${jsType} | ${shaped.shapeType}) { if (value instanceof capnp.List) { this.set${properName}(value); } else { this.set({ ${name}: value }); } }`,
      );
      return;
    }

    case s.Type.DATA:
      members.push(`get ${name}(): ${jsType} { return this.get${properName}(); }`);
      members.push(
        `set ${name}(value: ${jsType} | Uint8Array | string) { if (value instanceof capnp.Data) { this.set${properName}(value); } else { this.set({ ${name}: value }); } }`,
      );
      return;

    default:
      // Primitives, enums, text, AnyPointer, and interface clients mirror directly.
      members.push(`get ${name}(): ${jsType} { return this.get${properName}(); }`);
      members.push(`set ${name}(value: ${setType ?? jsType}) { this.set${properName}(value); }`);
      return;
  }
}

export function generateStructNode(ctx: CodeGeneratorFileContext, node: s.Node, interfaceNode: boolean): void {
  trace("generateStructNode(%s) [%s]", node, node.getDisplayName());

  const displayNamePrefix = getDisplayNamePrefix(node);
  const fullClassName = getFullClassName(node);
  const nestedNodes = node
    .getNestedNodes()
    .map((n) => lookupNode(ctx, n))
    .filter((n) => !n.isConst() && !n.isAnnotation());
  const nodeId = node.getId();
  const nodeIdHex = nodeId.toString(16);
  const struct = node.which() === s.Node.STRUCT ? node.getStruct() : undefined;
  const unionFields = getUnnamedUnionFields(node).sort(compareCodeOrder);

  const dataWordCount = struct ? struct.getDataWordCount() : 0;
  const dataByteLength = struct ? dataWordCount * 8 : 0;
  const discriminantCount = struct ? struct.getDiscriminantCount() : 0;
  const discriminantOffset = struct ? struct.getDiscriminantOffset() : 0;
  const fields = struct ? struct.getFields().toArray().sort(compareCodeOrder) : [];
  const pointerCount = struct ? struct.getPointerCount() : 0;

  const concreteLists = fields.filter(needsConcreteListClass).sort(compareCodeOrder);
  const consts = ctx.nodes.filter((n) => n.getScopeId() === nodeId && n.isConst());
  const hasUnnamedUnion = discriminantCount !== 0;

  if (hasUnnamedUnion) {
    generateUnnamedUnionEnum(ctx, fullClassName, unionFields);
  }

  const members: string[] = [];

  // static readonly CONSTANT = 'foo';
  members.push(
    ...consts.map(
      (n) =>
        `static readonly ${util.c2s(getDisplayNamePrefix(n))} = ${createValueExpression(n.getConst().getValue())};`,
    ),
  );

  // static readonly WHICH = MyStruct_Which.WHICH;
  members.push(
    ...unionFields.map((f) => {
      const name = util.c2s(f.getName());
      return `static readonly ${name} = ${fullClassName}_Which.${name};`;
    }),
  );

  // static readonly NestedStruct = MyStruct_NestedStruct;
  members.push(...nestedNodes.map((n) => `static readonly ${getDisplayNamePrefix(n)} = ${getFullClassName(n)};`));

  // static readonly Client = MyInterface_Client; static readonly Server = MyInterface_Server;
  if (interfaceNode) {
    members.push(`static readonly Client = ${fullClassName}_Client;`);
    members.push(`static readonly Server = ${fullClassName}_Server;`);
  }

  const defaultValues = fields.reduce(
    (acc, f) =>
      f.isSlot() &&
      f.getSlot().getHadExplicitDefault() &&
      f.getSlot().getType().which() !== s.Type.VOID &&
      f.getSlot().getType().which() !== s.Type.INTERFACE
        ? acc.concat(generateDefaultValue(f))
        : acc,
    [] as string[],
  );

  // static readonly _capnp = { displayName: 'MyStruct', id: '4732bab4310f81', size: new __O(8, 8) };
  const capnpProps = [
    `displayName: ${str(displayNamePrefix)}`,
    `id: ${str(nodeIdHex)}`,
    `size: new __O(${dataByteLength}, ${pointerCount})`,
  ].concat(defaultValues);
  members.push(`static readonly _capnp = { ${capnpProps.join(", ")} };`);

  // static _ConcreteListClass: MyStruct_ConcreteListClass;
  members.push(
    ...concreteLists.map((f) => `static _${util.c2t(f.getName())}: ${getJsType(ctx, f.getSlot().getType(), true)};`),
  );

  // getFoo() { ... } initFoo() { ... } setFoo() { ... }
  fields.forEach((f) => generateStructFieldMethods(ctx, members, node, f));

  // export interface MyStruct_Shape { ... }  +  get/set/toJSON methods.
  if (!interfaceNode) generateStructShape(ctx, fullClassName, fields, members);

  // toString(): string { return 'MyStruct_' + super.toString(); }
  members.push(method("toString", [], "string", [`${str(`${fullClassName}_`)} + super.toString()`], true));

  if (hasUnnamedUnion) {
    // which(): MyStruct_Which { return __S.getUint16(12, this); }
    members.push(
      method("which", [], `${fullClassName}_Which`, [`__S.getUint16(${discriminantOffset * 2}, this)`], true),
    );
  }

  // Make sure the interface classes are generated first.

  if (interfaceNode) {
    generateInterfaceClasses(ctx, node);
  }

  ctx.sourceParts.push(klass(fullClassName + genericParamDecl(genericParams(ctx, node)), members));

  // Write out the concrete list type initializer after all the class definitions. It can't be initialized within the
  // class's static initializer because the nested type might not be defined yet.
  // FIXME: This might be solvable with topological sorting?

  ctx.concreteLists.push(...concreteLists.map<[string, s.Field]>((f) => [fullClassName, f]));
}

/** One field's contribution to a struct's Shape/Json interfaces and get/set bodies. */

interface ShapeField {
  getExpr: string;
  /** Guard expression for get(); pointer fields emit only when non-null (else default
   *  views of self-referential types recurse forever). */
  hasGuard?: string;
  jsonType: string;
  name: string;
  setStmts: string[];
  shapeType: string;
  union: boolean;
}

/**
 * Emit `X_Shape` (liberal input) and `X_Json` (JSON-safe output) interfaces plus
 * `set`/`get`/`toJSON` members for plain-object assignment and extraction.
 *
 * 64-bit integers accept bigint|number|string and emit strings (JSON numbers cannot
 * hold them); Data accepts Uint8Array|base64 and emits base64. Fields with no simple
 * JSON mapping (AnyPointer, capabilities, nested lists, Data lists) are excluded.
 */

function generateStructShape(
  ctx: CodeGeneratorFileContext,
  fullClassName: string,
  fields: s.Field[],
  members: string[],
): void {
  const sf = fields.map((f) => shapeField(ctx, f)).filter((f): f is ShapeField => f !== null);

  ctx.sourceParts.push(
    sf.length === 0
      ? `export interface ${fullClassName}_Shape {}`
      : `export interface ${fullClassName}_Shape {\n${sf.map((f) => indent(`${f.name}?: ${f.shapeType};`)).join("\n")}\n}`,
  );
  ctx.sourceParts.push(
    sf.length === 0
      ? `export interface ${fullClassName}_Json {}`
      : `export interface ${fullClassName}_Json {\n${sf
          .map((f) => indent(`${f.name}${f.union || f.hasGuard !== undefined ? "?" : ""}: ${f.jsonType};`))
          .join("\n")}\n}`,
  );

  const setBody = sf.map((f) => {
    const cond = `value.${f.name} !== undefined`;

    return f.setStmts.length === 1
      ? `if (${cond}) ${f.setStmts[0]}`
      : `if (${cond}) {\n${indent(f.setStmts.join("\n"))}\n}`;
  });

  members.push(
    setBody.length === 0
      ? `set(_value: ${fullClassName}_Shape): void { }`
      : `set(value: ${fullClassName}_Shape): void {\n${setBody.map(indent).join("\n")}\n}`,
  );

  const getProps = sf.map((f) => {
    const guards = [
      ...(f.union ? [`this.is${util.c2t(f.name)}()`] : []),
      ...(f.hasGuard !== undefined ? [f.hasGuard] : []),
    ];

    return guards.length === 0
      ? `${f.name}: ${f.getExpr},`
      : `...(${guards.join(" && ")} ? { ${f.name}: ${f.getExpr} } : {}),`;
  });

  members.push(
    getProps.length === 0
      ? `get(): ${fullClassName}_Json { return {}; }`
      : `get(): ${fullClassName}_Json {\n${indent(`return {\n${getProps.map(indent).join("\n")}\n};`)}\n}`,
  );

  members.push(`toJSON(): ${fullClassName}_Json { return this.get(); }`);
}

function shapeField(ctx: CodeGeneratorFileContext, field: s.Field): ShapeField | null {
  const name = field.getName();
  const properName = util.c2t(name);
  const union = field.getDiscriminantValue() !== s.Field.NO_DISCRIMINANT;
  const v = `value.${name}`;
  const direct = (t: string): ShapeField => ({
    getExpr: `this.get${properName}()`,
    jsonType: t,
    name,
    setStmts: [`this.set${properName}(${v});`],
    shapeType: t,
    union,
  });

  if (field.isGroup()) {
    const groupClass = getFullClassName(lookupNode(ctx, field.getGroup().getTypeId()));

    return {
      getExpr: `this.get${properName}().get()`,
      jsonType: `${groupClass}_Json`,
      name,
      setStmts: [`this.init${properName}().set(${v});`],
      shapeType: `${groupClass}_Shape`,
      union,
    };
  }

  if (!field.isSlot()) return null;

  const type = field.getSlot().getType();

  switch (type.which()) {
    case s.Type.BOOL:
      return direct("boolean");

    case s.Type.ENUM:
      return direct(getJsType(ctx, type, false));

    case s.Type.FLOAT32:
    case s.Type.FLOAT64:
    case s.Type.INT8:
    case s.Type.INT16:
    case s.Type.INT32:
    case s.Type.UINT8:
    case s.Type.UINT16:
    case s.Type.UINT32:
      return direct("number");

    case s.Type.INT64:
    case s.Type.UINT64:
      return {
        getExpr: `this.get${properName}().toString()`,
        jsonType: "string",
        name,
        setStmts: [`this.set${properName}(BigInt(${v}));`],
        shapeType: "bigint | number | string",
        union,
      };

    case s.Type.TEXT:
      return direct("string");

    case s.Type.DATA:
      return {
        getExpr: `capnp.bytesToBase64(this.get${properName}().toUint8Array())`,
        hasGuard: `this.has${properName}()`,
        jsonType: "string",
        name,
        setStmts: [
          `const b = typeof ${v} === "string" ? capnp.base64ToBytes(${v}) : ${v};`,
          `this.init${properName}(b.byteLength).copyBuffer(b);`,
        ],
        shapeType: "Uint8Array | string",
        union,
      };

    case s.Type.STRUCT: {
      const c = getFullClassName(lookupNode(ctx, type.getStruct().getTypeId()));

      return {
        getExpr: `this.get${properName}().get()`,
        hasGuard: `this.has${properName}()`,
        jsonType: `${c}_Json`,
        name,
        setStmts: [`this.init${properName}().set(${v});`],
        shapeType: `${c}_Shape`,
        union,
      };
    }

    case s.Type.LIST:
      return shapeListField(ctx, field, name, properName, union, v);

    case s.Type.VOID:
      if (!union) return null;

      return {
        getExpr: "null",
        jsonType: "null",
        name,
        setStmts: [`this.set${properName}();`],
        shapeType: "null",
        union,
      };

    default:
      // AnyPointer, capabilities, and anything else without a simple JSON mapping.
      return null;
  }
}

function shapeListField(
  ctx: CodeGeneratorFileContext,
  field: s.Field,
  name: string,
  properName: string,
  union: boolean,
  v: string,
): ShapeField | null {
  const elementType = field.getSlot().getType().getList().getElementType();

  switch (elementType.which()) {
    case s.Type.BOOL:
    case s.Type.ENUM:
    case s.Type.FLOAT32:
    case s.Type.FLOAT64:
    case s.Type.INT8:
    case s.Type.INT16:
    case s.Type.INT32:
    case s.Type.UINT8:
    case s.Type.UINT16:
    case s.Type.UINT32:
    case s.Type.TEXT: {
      const t = getJsType(ctx, elementType, false);

      return {
        getExpr: `this.get${properName}().toArray()`,
        hasGuard: `this.has${properName}()`,
        jsonType: `${t}[]`,
        name,
        setStmts: [`const l = this.init${properName}(${v}.length);`, `${v}.forEach((e, i) => l.set(i, e));`],
        shapeType: `readonly ${t}[]`,
        union,
      };
    }

    case s.Type.INT64:
    case s.Type.UINT64:
      return {
        getExpr: `this.get${properName}().toArray().map((e) => e.toString())`,
        hasGuard: `this.has${properName}()`,
        jsonType: "string[]",
        name,
        setStmts: [`const l = this.init${properName}(${v}.length);`, `${v}.forEach((e, i) => l.set(i, BigInt(e)));`],
        shapeType: "readonly (bigint | number | string)[]",
        union,
      };

    case s.Type.STRUCT: {
      const c = getFullClassName(lookupNode(ctx, elementType.getStruct().getTypeId()));

      return {
        getExpr: `this.get${properName}().toArray().map((e) => e.get())`,
        hasGuard: `this.has${properName}()`,
        jsonType: `${c}_Json[]`,
        name,
        setStmts: [`const l = this.init${properName}(${v}.length);`, `${v}.forEach((e, i) => l.get(i).set(e));`],
        shapeType: `readonly ${c}_Shape[]`,
        union,
      };
    }

    default:
      // Lists of lists, Data, AnyPointer, and capabilities are excluded.
      return null;
  }
}

export function generateUnnamedUnionEnum(
  ctx: CodeGeneratorFileContext,
  fullClassName: string,
  unionFields: s.Field[],
): void {
  const members = unionFields
    .sort(compareCodeOrder)
    .map((field) => ({ name: util.c2s(field.getName()), value: field.getDiscriminantValue() }));

  ctx.sourceParts.push(enumDecl(`${fullClassName}_Which`, members));
}

export function getImportNodes(ctx: CodeGeneratorFileContext, node: s.Node): s.Node[] {
  return lookupNode(ctx, node)
    .getNestedNodes()
    .filter((n) => hasNode(ctx, n))
    .map((n) => lookupNode(ctx, n))
    .reduce((a, n) => a.concat([n], getImportNodes(ctx, n)), new Array<s.Node>())
    .filter((n) => {
      const node = lookupNode(ctx, n);
      return node.isStruct() || node.isEnum() || node.isInterface();
    });
}
