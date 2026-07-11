/**
 * RemotePromise: the result of an RPC method call.
 *
 * A custom thenable — not a Promise subclass. `await` works directly. Generated
 * subtypes (e.g. `Calculator_GetOperator$Promise`) add pipelined accessors for
 * capability fields in the result struct, returning clients synchronously before the
 * call resolves via the protected `pipelineClient` primitive.
 *
 * Calls send eagerly: the Call message is on the wire before this object is returned.
 * `then` carries no protocol behavior — it only subscribes to the Return. Instances are
 * constructed with no arguments and initialized by the runtime, so generated subclasses
 * must not define constructor parameters.
 */

import { RPC_PROMISE_NOT_INITIALIZED } from "../errors";
import type { Client } from "./client";

export interface RemotePromiseState<R> {
  pipeline(index: number): Client;
  promise: Promise<R>;
}

const STATE = new WeakMap<RemotePromise<unknown>, RemotePromiseState<unknown>>();

export class RemotePromise<R> implements PromiseLike<R> {
  catch<TResult = never>(
    onrejected?: ((reason: unknown) => TResult | PromiseLike<TResult>) | null,
  ): Promise<R | TResult> {
    return this.then(undefined, onrejected);
  }

  finally(onfinally?: (() => void) | null): Promise<R> {
    return this.then(
      (value) => {
        onfinally?.();
        return value;
      },
      (reason) => {
        onfinally?.();
        throw reason;
      },
    );
  }

  /**
   * A pipelined client for the capability at pointer field `index` of the (not yet
   * received) result struct. Generated pipelined accessors delegate here.
   */

  protected pipelineClient(index: number): Client {
    return state(this).pipeline(index);
  }

  then<TResult1 = R, TResult2 = never>(
    onfulfilled?: ((value: R) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): Promise<TResult1 | TResult2> {
    return state(this).promise.then(onfulfilled, onrejected);
  }
}

/** Construct and initialize a RemotePromise (or generated subclass). Runtime use only. */

export function initRemotePromise<R, A extends RemotePromise<R>>(
  PromiseClass: new () => A,
  s: RemotePromiseState<R>,
): A {
  const p = new PromiseClass();

  STATE.set(p, s);

  return p;
}

function state<R>(p: RemotePromise<R>): RemotePromiseState<R> {
  const s = STATE.get(p) as RemotePromiseState<R> | undefined;

  if (s === undefined) throw new Error(RPC_PROMISE_NOT_INITIALIZED);

  return s;
}
