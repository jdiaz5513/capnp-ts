import * as s from "capnp-ts/src/std/schema.capnp.js";
import { format } from "capnp-ts/src/util";
import initTrace from "debug";

import { CodeGeneratorFileContext } from "./code-generator-file-context";
import { ConcreteListType } from "./constants";
import * as E from "./errors";
import * as util from "./util";

const trace = initTrace("capnpc:file");
trace("load");

export function compareCodeOrder(a: { getCodeOrder(): number }, b: { getCodeOrder(): number }): number {
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
  return node.getDisplayName().split(":")[1].split(".").map(util.c2t).join("_");
}

export function getJsType(ctx: CodeGeneratorFileContext, type: s.Type, constructor: boolean): string {
  const whichType = type.which();

  switch (whichType) {
    case s.Type.ANY_POINTER:
      return "capnp.Pointer";

    case s.Type.BOOL:
      return "boolean";

    case s.Type.DATA:
      return "capnp.Data";

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
      return "number";

    case s.Type.UINT64:
    case s.Type.INT64:
      return "bigint";

    case s.Type.INTERFACE:
      return "capnp.Interface";

    case s.Type.LIST:
      return `capnp.List${constructor ? "Ctor" : ""}<${getJsType(ctx, type.getList().getElementType(), false)}>`;

    case s.Type.STRUCT: {
      const c = getFullClassName(lookupNode(ctx, type.getStruct().getTypeId()));

      return constructor ? `capnp.StructCtor<${c}>` : c;
    }

    case s.Type.TEXT:
      return "string";

    case s.Type.VOID:
      return "capnp.Void";

    default:
      throw new Error(format(E.GEN_UNKNOWN_TYPE, whichType));
  }
}

export function getUnnamedUnionFields(node: s.Node): s.Field[] {
  if (!node.isStruct()) return [];

  return node
    .getStruct()
    .getFields()
    .filter((f) => f.getDiscriminantValue() !== s.Field.NO_DISCRIMINANT);
}

export function hasNode(ctx: CodeGeneratorFileContext, lookup: { getId(): bigint } | bigint): boolean {
  const id = typeof lookup === "bigint" ? lookup : lookup.getId();

  return ctx.nodes.some((n) => n.getId() === id);
}

export function loadRequestedFile(
  req: s.CodeGeneratorRequest,
  file: s.CodeGeneratorRequest_RequestedFile
): CodeGeneratorFileContext {
  trace("compile(%s, %s)", req, file);

  const ctx = new CodeGeneratorFileContext(req, file);

  const schema = lookupNode(ctx, file.getId());

  ctx.tsPath = schema.getDisplayName() + ".ts";

  return ctx;
}

export function lookupNode(ctx: CodeGeneratorFileContext, lookup: { getId(): bigint } | bigint): s.Node {
  const id = typeof lookup === "bigint" ? lookup : lookup.getId();
  const node = ctx.nodes.find((n) => n.getId() === id);

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

/**
 * A single type parameter visible to a node. `flatIndex` is its position in
 * the node's full scope chain (outermost scope first). This is the index used
 * for runtime constructor bindings.
 */

export interface GenericParam {
  flatIndex: number;
  name: string;
  parameterIndex: number;
  scopeId: bigint;
}

/** Get all type parameters in scope for `node`, outermost scope first. */
export function genericParams(ctx: CodeGeneratorFileContext, node: s.Node): GenericParam[] {
  const implicit = ctx.implicitScopes.get(node.getId().toString());
  if (implicit !== undefined) return implicit as GenericParam[];

  const chain: s.Node[] = [];
  let cur = node;

  for (;;) {
    chain.unshift(cur);
    const scopeId = cur.getScopeId();
    if (scopeId === BigInt(0) || !hasNode(ctx, scopeId)) break;
    cur = lookupNode(ctx, scopeId);
  }

  const out: GenericParam[] = [];
  for (const n of chain) {
    n.getParameters()
      .toArray()
      .forEach((p, parameterIndex) => {
        out.push({
          flatIndex: out.length,
          name: p.getName(),
          parameterIndex,
          scopeId: n.getId(),
        });
      });
  }

  const seen = new Set<string>();
  for (const p of out) {
    if (seen.has(p.name)) p.name = `${p.name}_${p.flatIndex}`;
    seen.add(p.name);
  }

  return out;
}

/** `<State extends capnp.Struct = capnp.Struct>`, or empty. */
export function genericParamDecl(params: GenericParam[]): string {
  if (params.length === 0) return "";
  return `<${params.map((p) => `${p.name} extends capnp.Struct = capnp.Struct`).join(", ")}>`;
}

/** `<State>`, or empty. */
export function genericArgNames(params: GenericParam[]): string {
  if (params.length === 0) return "";
  return `<${params.map((p) => p.name).join(", ")}>`;
}

export interface StructBinding {
  kind: "struct";
  /** Nested brand bindings for a generic struct, or null for a plain one. */
  bindings: BrandBinding[] | null;
  name: string;
}

export interface ParameterBinding {
  kind: "parameter";
  parameter: GenericParam;
}

export type BrandBinding = StructBinding | ParameterBinding;

/** True when the binding is fully concrete: a static ctor expression exists. */
export const brandBound = (b: BrandBinding): boolean =>
  b.kind === "struct" && (b.bindings === null || b.bindings.every(brandBound));

/** The TypeScript type argument for a binding, e.g. `Box<Thing>` or `U`. */
export const brandTypeArg = (b: BrandBinding): string =>
  b.kind === "parameter"
    ? b.parameter.name
    : b.bindings === null
      ? b.name
      : `${b.name}<${b.bindings.map(brandTypeArg).join(", ")}>`;

/**
 * The runtime ctor expression for a binding, rendering parameter references
 * through `parameterExpr` (context decides: `capnp.getGenericBinding(this, i)`
 * at struct accessor sites, `bindings[i]` in client/server constructors).
 * Null when any parameter has no rendering in the calling context.
 */

export const brandCtorExpr = (
  b: BrandBinding,
  parameterExpr: (p: GenericParam) => string | null,
): string | null => {
  if (b.kind === "parameter") return parameterExpr(b.parameter);
  if (b.bindings === null) return b.name;
  const nested = b.bindings.map((n) => brandCtorExpr(n, parameterExpr));
  if (nested.some((n) => n === null)) return null;
  return `capnp.bindGeneric(${b.name}, [${nested.join(", ")}])`;
};

/** Replace parameter references with the bindings they compose through. */
export const brandSubstitute = (b: BrandBinding, bindings: BrandBinding[]): BrandBinding => {
  if (b.kind === "parameter") return bindings[b.parameter.flatIndex] ?? b;
  if (b.bindings === null) return b;
  return { ...b, bindings: b.bindings.map((n) => brandSubstitute(n, bindings)) };
};

/** True when every parameter reference in the tree is a member of `env`. */
export const brandParametersIn = (b: BrandBinding, env: GenericParam[]): boolean =>
  b.kind === "parameter"
    ? env.some((g) => g.scopeId === b.parameter.scopeId && g.parameterIndex === b.parameter.parameterIndex)
    : (b.bindings?.every((n) => brandParametersIn(n, env)) ?? true);

/**
 * Resolve a use-site `Brand` against `targetId`'s parameter list. Every
 * parameter must bind to a concrete struct (or a parameter of the
 * enclosing generic context, `env`) or the whole resolution fails.
 */

export function resolveBrand(
  ctx: CodeGeneratorFileContext,
  targetId: bigint,
  brand: s.Brand,
  env: GenericParam[],
): BrandBinding[] | null {
  const params = genericParams(ctx, lookupNode(ctx, targetId));
  if (params.length === 0) return null;

  const scopes = brand.getScopes().toArray();
  const out: BrandBinding[] = [];
  for (const p of params) {
    const scope = scopes.find((sc) => sc.getScopeId() === p.scopeId);
    if (scope === undefined || !scope.isBind()) return null;

    const bind = scope.getBind().toArray();
    const binding = bind[p.parameterIndex];
    if (binding === undefined || !binding.isType()) return null;

    const resolved = resolveBindingType(ctx, binding.getType(), env);
    if (resolved === null) return null;

    out.push(resolved);
  }

  return out;
}

function resolveBindingType(
  ctx: CodeGeneratorFileContext,
  type: s.Type,
  env: GenericParam[],
): BrandBinding | null {
  switch (type.which()) {
    case s.Type.STRUCT: {
      const node = lookupNode(ctx, type.getStruct().getTypeId());
      const name = getFullClassName(node);
      const nested = resolveBrand(ctx, node.getId(), type.getStruct().getBrand(), env);
      return { kind: "struct", bindings: nested, name };
    }
    case s.Type.ANY_POINTER: {
      const any = type.getAnyPointer();
      if (any.which() !== s.Type_AnyPointer.PARAMETER) return null;

      const ref = any.getParameter();
      const p = env.find(
        (e) => e.scopeId === ref.getScopeId() && e.parameterIndex === ref.getParameterIndex(),
      );
      if (p === undefined) return null;

      return { kind: "parameter", parameter: p };
    }
    default:
      return null;
  }
}

/**
 * One row of an interface's flattened method table: the method, the interface
 * that declares it, its id within that interface, and the brand bindings
 * resolved from the `extends` chain (null when nothing needs substituting).
 */

export interface FlatMethod {
  bindings: BrandBinding[] | null;
  declaring: s.Node;
  method: s.Method;
  methodId: number;
}

/**
 * Flatten an interface's own and transitively inherited methods into one
 * table. Own methods come first so existing table indices stay stable;
 * inherited methods follow in superclass declaration order, deduplicated by
 * (declaring interface, method id) to survive diamonds. Each hop's brand is
 * resolved against the declaring scope and composed through the accumulated
 * bindings, so re-parameterized chains like `B(U) extends(A(U))` used as
 * `extends(B(Thing))` arrive fully bound. The one unresolved corner: an
 * intermediate's parameter nested inside a struct brand (`extends(A(Box(U)))`)
 * stays unbound and callers fall back to explicit ctors.
 */

export function flattenMethods(ctx: CodeGeneratorFileContext, node: s.Node): FlatMethod[] {
  const out: FlatMethod[] = [];
  const seen = new Set<string>();

  const visit = (iface: s.Node, bindings: BrandBinding[] | null): void => {
    iface
      .getInterface()
      .getMethods()
      .toArray()
      .forEach((method, methodId) => {
        const key = `${iface.getId()}:${methodId}`;
        if (seen.has(key)) return;
        seen.add(key);
        out.push({ bindings, declaring: iface, method, methodId });
      });
    const env = genericParams(ctx, iface);
    iface
      .getInterface()
      .getSuperclasses()
      .toArray()
      .forEach((superclass) => {
        if (!hasNode(ctx, superclass.getId())) return;
        const raw = resolveBrand(ctx, superclass.getId(), superclass.getBrand(), env);
        const composed =
          bindings === null ? raw : (raw?.map((b) => brandSubstitute(b, bindings)) ?? null);
        visit(lookupNode(ctx, superclass.getId()), composed);
      });
  };

  visit(node, null);
  return out;
}

/**
 * The in-scope parameter matching an `AnyPointer.parameter` reference,
 * if `type` is one.
 */

export function parameterRef(type: s.Type, env: GenericParam[]): GenericParam | undefined {
  if (type.which() !== s.Type.ANY_POINTER) return undefined;
  const any = type.getAnyPointer();
  if (any.which() !== s.Type_AnyPointer.PARAMETER) return undefined;

  const ref = any.getParameter();
  return env.find(
    (e) => e.scopeId === ref.getScopeId() && e.parameterIndex === ref.getParameterIndex(),
  );
}
