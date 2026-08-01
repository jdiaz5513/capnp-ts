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

export interface BrandBinding {
  ctorExpr: string;
  typeArg: string;
}

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
      if (nested === null) return { ctorExpr: name, typeArg: name };

      return {
        ctorExpr: `capnp.bindGeneric(${name}, [${nested.map((b) => b.ctorExpr).join(", ")}])`,
        typeArg: `${name}<${nested.map((b) => b.typeArg).join(", ")}>`,
      };
    }
    case s.Type.ANY_POINTER: {
      const any = type.getAnyPointer();
      if (any.which() !== s.Type_AnyPointer.PARAMETER) return null;

      const ref = any.getParameter();
      const p = env.find(
        (e) => e.scopeId === ref.getScopeId() && e.parameterIndex === ref.getParameterIndex(),
      );
      if (p === undefined) return null;

      // Re-binding through an enclosing generic: the ctor comes off the
      // instance's own bindings at accessor-emission sites (`this`).
      return {
        ctorExpr: `capnp.getGenericBinding(this, ${p.flatIndex})`,
        typeArg: p.name,
      };
    }
    default:
      return null;
  }
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
