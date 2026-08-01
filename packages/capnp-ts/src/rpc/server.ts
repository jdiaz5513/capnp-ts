/**
 * Server: a locally-implemented capability.
 *
 * Generated server classes (e.g. `Calculator_Server`) extend this with a typed method
 * table; the user provides a plain object implementing the interface's methods:
 *
 *   new Calculator.Server({ add: (params, results) => { results.setSum(...); } })
 *
 * Method implementations may be synchronous or return a Promise; results are sent when
 * the returned promise (if any) settles.
 */

import { Struct } from "../serialization/pointers/struct";
import { Method } from "./client";

export class Server {
  readonly methods: ServerMethod[];

  constructor(methods: ServerMethod[]) {
    this.methods = methods;
  }
}

/**
 * A type-erased entry in a server's method table.
 *
 * Why any? Each of the table entries pair up with different param/result structs.
 * `Method`'s type parameters sit in both covariant (ParamsClass/ResultsClass) and
 * contravariant (impl's parameters) positions, so no common bound exists. `unknown`
 * rejects every concrete impl under strictFunctionTypes, and `Struct` fails the same
 * way from the other side. `any` provides type erasure; generated server classes restore
 * typing at the API boundary and the runtime dispatches by methodId without relying on
 * these types.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
export interface ServerMethod extends Method<any, any> {
  impl: ServerMethodImpl<any, any>;
}
/* eslint-enable @typescript-eslint/no-explicit-any */

/** A single server method implementation: populate `results` from `params`. */

export type ServerMethodImpl<P extends Struct, R extends Struct> = (params: P, results: R) => void | Promise<void>;
