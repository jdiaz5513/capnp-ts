/**
 * Client: a reference to a capability (local, remote, or promised).
 *
 * Generated interface clients (e.g. `Calculator_Client`) wrap a Client and expose typed
 * methods. Lifetime is explicit: disposing a client releases its slot in the
 * connection's import table (sending a Release message). Both `dispose()` and
 * `Symbol.dispose` are provided; `using` works where the runtime supports it.
 */

import { Message } from "../serialization/message";
import { Struct, StructCtor } from "../serialization/pointers/struct";
import { initRemotePromise, RemotePromise } from "./remote-promise";
import { resolveCapability } from "./capability";
import type { Answer, Conn, Question } from "./conn";
import type { Server, ServerMethod } from "./server";

/** Metadata describing one interface method; emitted by codegen. */

export interface Method<P extends Struct, R extends Struct> {
  interfaceId: bigint;
  interfaceName: string;
  methodId: number;
  methodName: string;
  ParamsClass: StructCtor<P>;
  ResultsClass: StructCtor<R>;
}

/**
 * Params for a call: a builder callback or a plain-object shape (generated method
 * signatures narrow the shape to the param struct's X_Shape type).
 */

// `object`, not `Record<string, unknown>`: generated X_Shape interfaces
// have no index signature, so they are not assignable to a Record.
export type ParamsInit<P extends Struct> = ((params: P) => void) | object;

/** Apply a ParamsInit to a freshly allocated params struct. */

export function applyParams<P extends Struct>(init: ParamsInit<P> | undefined, params: P): void {
  if (typeof init === "function") {
    init(params);
  } else if (init !== undefined) {
    (params as P & { set(value: object): void }).set(init);
  }
}

/** Generated RemotePromise subclasses must be constructible with no arguments. */

export type RemotePromiseCtor<R extends Struct, A extends RemotePromise<R>> = new () => A;

/** Where calls on a Client go. Internal. */

export type Target =
  | { answer: Answer; tag: "answer"; transform: number[] }
  | { tag: "broken"; reason: string }
  | { tag: "import"; conn: Conn; id: number }
  | { tag: "local"; server: Server }
  | { tag: "promised"; question: Question; transform: number[] };

export class Client {
  _target: Target;

  constructor(target: Target) {
    this._target = target;
  }

  /**
   * Start a call on this capability. The Call message is sent (or dispatched locally)
   * before this returns; the returned RemotePromise resolves with the results.
   * Generated methods pass their pipelined RemotePromise subclass as `PromiseClass`.
   */

  call<P extends Struct, R extends Struct, A extends RemotePromise<R> = RemotePromise<R>>(
    method: Method<P, R>,
    paramsFunc?: ParamsInit<P>,
    PromiseClass?: RemotePromiseCtor<R, A>,
  ): A {
    const Promised = PromiseClass ?? (RemotePromise as RemotePromiseCtor<R, A>);
    const target = this._target;

    switch (target.tag) {
      case "answer": {
        // A capability living in one of our own unresolved answers; deliver once the
        // answer settles. (Thenable results assimilate into the promise chain.)
        const promise: Promise<R> = target.answer.payloadPromise.then((payload) =>
          resolveCapability(payload, target.transform).call(method, paramsFunc),
        );

        promise.catch(() => undefined);

        return initRemotePromise(Promised, {
          pipeline: () => new Client({ reason: "pipelining on receiver answers is not implemented", tag: "broken" }),
          promise,
        });
      }

      case "broken":
        return brokenCall(Promised, target.reason);

      case "import":
        return target.conn.sendCall({ importedCap: target.id }, method, paramsFunc, Promised);

      case "local":
        return localCall(target.server, method, paramsFunc, Promised);

      case "promised": {
        const q = target.question;

        if (q.state === "resolved") {
          return q.clientForTransform(target.transform).call(method, paramsFunc, PromiseClass) as A;
        }

        if (q.state === "rejected") return brokenCall(Promised, q.error?.message ?? "call failed");

        return q.conn.sendCall(
          { promisedAnswer: { questionId: q.id, transform: target.transform } },
          method,
          paramsFunc,
          Promised,
        );
      }
    }
  }

  dispose(): void {
    const target = this._target;

    if (target.tag === "broken") return;

    this._target = { reason: "capability was disposed", tag: "broken" };

    if (target.tag === "import") target.conn.releaseImport(target.id);
  }

  [Symbol.dispose](): void {
    this.dispose();
  }
}

function brokenCall<R extends Struct, A extends RemotePromise<R>>(
  PromiseClass: RemotePromiseCtor<R, A>,
  reason: string,
): A {
  const promise: Promise<R> = Promise.reject(new Error(reason));

  promise.catch(() => undefined);

  return initRemotePromise(PromiseClass, {
    pipeline: () => new Client({ reason, tag: "broken" }),
    promise,
  });
}

function localCall<P extends Struct, R extends Struct, A extends RemotePromise<R>>(
  server: Server,
  method: Method<P, R>,
  paramsFunc: ParamsInit<P> | undefined,
  PromiseClass: RemotePromiseCtor<R, A>,
): A {
  const impl = server.methods.find(
    (m: ServerMethod) => m.interfaceId === method.interfaceId && m.methodId === method.methodId,
  );

  const promise = (async (): Promise<R> => {
    if (impl === undefined) {
      throw new Error(`no such method: ${method.interfaceName}.${method.methodName}`);
    }

    const params = new Message().initRoot(method.ParamsClass);

    applyParams(paramsFunc, params);

    const results = new Message().initRoot(method.ResultsClass);

    await impl.impl(params, results);

    return results;
  })();

  promise.catch(() => undefined);

  return initRemotePromise(PromiseClass, {
    pipeline: () => new Client({ reason: "pipelining on local calls is not implemented", tag: "broken" }),
    promise,
  });
}
