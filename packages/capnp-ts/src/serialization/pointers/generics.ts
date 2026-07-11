/**
 * Runtime support for generic structs/interfaces. Cap'n Proto generics
 * are erased on the wire (a type parameter is an AnyPointer); bindings
 * exist only so typed accessors know which concrete struct to read.
 *
 * `bindGeneric` specializes a generated generic struct class by
 * attaching constructor bindings as a static on an anonymous subclass;
 * generated accessors look their parameter's ctor up via
 * `getGenericBinding`. Statics (`_capnp` etc.) inherit through the
 * prototype chain, so a bound subclass is a drop-in `StructCtor`.
 */

import { GENERIC_READ_UNBOUND } from "../../errors";
import { Struct, StructCtor } from "./struct";

export const BINDINGS = Symbol("capnp:generic-bindings");

export interface BoundStructCtor<T extends Struct> extends StructCtor<T> {
  [BINDINGS]: ReadonlyArray<StructCtor<Struct>>;
}

/**
 * Specialize a generic struct class with concrete parameter constructors
 * (outermost scope's parameters first).
 */

export function bindGeneric<C extends StructCtor<Struct>>(
  Base: C,
  bindings: ReadonlyArray<StructCtor<Struct>>,
): C & BoundStructCtor<InstanceType<C>> {
  // The subclass-of-a-type-param trick can't be expressed for the
  // checker; the cast is internal and the shape is correct by
  // construction (statics inherit, construct signature is Base's).
  return class extends (Base as StructCtor<Struct>) {
    static [BINDINGS] = bindings;
  } as unknown as C & BoundStructCtor<InstanceType<C>>;
}

/**
 * Get the bound constructor for parameter `index` of `struct`'s class, or the
 * explicit override; throws when the read has no binding to work with.
 */

export function getGenericBinding<T extends Struct>(
  struct: Struct,
  index: number,
  explicit?: StructCtor<T>,
): StructCtor<T> {
  if (explicit !== undefined) return explicit;

  const ctor = (struct.constructor as BoundStructCtor<Struct>)[BINDINGS]?.[index];
  if (ctor === undefined) throw new Error(GENERIC_READ_UNBOUND);

  // Sound by construction: codegen writes each binding at the same
  // flat index it reads, typed by the same brand resolution.
  return ctor as StructCtor<T>;
}
