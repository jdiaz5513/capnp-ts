/**
 * Runtime schema annotation metadata, as emitted into generated code (`_capnp.annotations`,
 * `_capnp.fieldAnnotations`, and `_capnpFileAnnotations`).
 *
 * @author jdiaz5513
 */

/** A single annotation application. The id is the annotation node's id as a hex string, like `_capnp.id`. */

export interface SchemaAnnotation {
  id: string;
  value: unknown;
}

/** Anything generated that can carry schema annotations (a struct or interface class). */

interface Annotated {
  _capnp: { annotations?: SchemaAnnotation[] };
}

/**
 * Look up the value of an annotation by id. The same annotation may legally be applied more than once; this returns
 * the last application. Use {@link getAnnotations} to see all of them.
 *
 * @export
 * @param {Annotated} target The generated class to inspect.
 * @param {string} id The annotation node's id as a hex string.
 * @returns {unknown} The last applied value, or `undefined` if the annotation is not applied.
 */

export function getAnnotation(target: Annotated, id: string): unknown {
  const values = getAnnotations(target, id);

  return values.length > 0 ? values[values.length - 1] : undefined;
}

/**
 * Look up all applied values of an annotation by id, in declaration order.
 *
 * @export
 * @param {Annotated} target The generated class to inspect.
 * @param {string} id The annotation node's id as a hex string.
 * @returns {unknown[]} The applied values; empty if the annotation is not applied.
 */

export function getAnnotations(target: Annotated, id: string): unknown[] {
  return (target._capnp.annotations ?? []).filter((a) => a.id === id).map((a) => a.value);
}
