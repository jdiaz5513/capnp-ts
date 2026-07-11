/**
 * Conn: one side of a two-party Cap'n Proto RPC connection (vat-to-vat).
 *
 * Owns the four RPC tables (questions, answers, imports, exports) and the message
 * dispatch loop. Wraps a raw WebSocket directly, or any Transport implementation:
 *
 *   // server
 *   new Conn(ws, { main: new Calculator.Server({ ... }) });
 *   // client
 *   const conn = new Conn(ws);
 *   const calc = conn.bootstrap(Calculator);
 *
 * The bootstrap capability is supplied at construction (not post-hoc) so a Bootstrap
 * message can never race main registration.
 */

import {
  Message as RPCMessage,
  Message_Which,
  CapDescriptor,
  CapDescriptor_Which,
  Disembargo,
  Disembargo_Context_Which,
  MessageTarget_Which,
  Payload,
  Return_Which,
} from "../std/rpc.capnp.js";
import { RPC_NO_MAIN_INTERFACE, RPC_UNKNOWN_ANSWER_ID, RPC_UNKNOWN_EXPORT_ID } from "../errors";
import { format } from "../util";
import { Message } from "../serialization/message";
import { isNull, setInterfacePointer } from "../serialization/pointers/pointer";
import { getPointer, getStruct, initStructAt, Struct } from "../serialization/pointers/struct";
import { brokenClient, resolveCapability } from "./capability";
import { applyParams, Client, Method, ParamsInit, RemotePromiseCtor } from "./client";
import { initRemotePromise, RemotePromise } from "./remote-promise";
import { Server } from "./server";
import { isWebSocketLike, Transport, WebSocketLike, WebSocketTransport } from "./transport";

/** A pending incoming call; kept until the peer sends Finish. */

export class Answer {
  readonly payloadPromise: Promise<Payload>;
  rejectPayload!: (err: Error) => void;
  resolvePayload!: (payload: Payload) => void;

  constructor() {
    this.payloadPromise = new Promise<Payload>((resolve, reject) => {
      this.rejectPayload = reject;
      this.resolvePayload = resolve;
    });
    this.payloadPromise.catch(() => undefined);
  }
}

/** A pending outgoing call; resolved by the peer's Return. */

export class Question {
  readonly conn: Conn;
  error?: Error;
  readonly id: number;
  payload?: Payload;
  readonly promise: Promise<Payload>;
  state: "pending" | "rejected" | "resolved" = "pending";

  private _reject!: (err: Error) => void;
  private _resolve!: (payload: Payload) => void;

  constructor(conn: Conn, id: number) {
    this.conn = conn;
    this.id = id;
    this.promise = new Promise<Payload>((resolve, reject) => {
      this._reject = reject;
      this._resolve = resolve;
    });
    this.promise.catch(() => undefined);
  }

  /** A client for the capability at `transform` in this question's (resolved) answer. */

  clientForTransform(transform: number[]): Client {
    if (this.state === "rejected") return brokenClient(this.error?.message ?? "call failed");
    if (this.payload === undefined) return brokenClient("question is not resolved");

    return resolveCapability(this.payload, transform);
  }

  /** A client for `transform` in this answer, callable before the answer arrives. */

  pipelineClient(transform: number[]): Client {
    if (this.state === "pending") return new Client({ question: this, tag: "promised", transform });

    return this.clientForTransform(transform);
  }

  reject(err: Error): void {
    if (this.state !== "pending") return;
    this.error = err;
    this.state = "rejected";
    this._reject(err);
  }

  resolve(payload: Payload): void {
    if (this.state !== "pending") return;
    this.payload = payload;
    this.state = "resolved";
    this._resolve(payload);
  }
}

/** A Call message's target, prior to encoding. */

export type CallTarget = { importedCap: number } | { promisedAnswer: { questionId: number; transform: number[] } };

export interface ConnOptions {
  /** The bootstrap capability offered to the remote vat. */
  main?: Server;
  /** Called when the remote sends an Abort or the transport drops unexpectedly. */
  onError?: (err: Error) => void;
}

/** The static surface of a generated interface class, as far as Conn is concerned. */

export interface InterfaceCtor<C> {
  readonly _capnp: { displayName: string; id: string };
  readonly Client: new (client: Client) => C;
}

export class Conn {
  readonly transport: Transport;

  private readonly answers = new Map<number, Answer>();
  /**
   * Serializes call delivery: every incoming call begins execution in arrival order,
   * even when its target resolves asynchronously (E-order for the two-party case).
   */
  private deliveryChain: Promise<void> = Promise.resolve();
  private readonly exportIds = new Map<Client, number>();
  private readonly exports = new Map<number, { client: Client; refs: number }>();
  /**
   * Import entries use WeakRef so that GC can reclaim dropped capability clients.
   * FinalizationRegistry sends a Release for any import whose Client was collected
   * without an explicit dispose() — a best-effort safety net, not a replacement
   * for explicit disposal.
   */
  private readonly imports = new Map<number, { ref: WeakRef<Client>; refs: number }>();
  private readonly main?: Client;
  private nextExportId = 0;
  private nextQuestionId = 0;
  private readonly onError?: (err: Error) => void;
  private readonly questions = new Map<number, Question>();
  private closed = false;

  /**
   * Fires when an import Client is garbage collected without being disposed.
   * Sends a Release for the import's refcount as a best-effort cleanup.
   */
  private readonly registry = new FinalizationRegistry<number>((id) => {
    if (this.closed) return;
    const entry = this.imports.get(id);
    if (entry === undefined) return;
    // Stale callback: Client was disposed (and thus unregistered) but GC deferred.
    if (entry.ref.deref() !== undefined) return;
    this.imports.delete(id);
    this.sendRelease(id, entry.refs);
  });

  constructor(transport: Transport | WebSocketLike, opts?: ConnOptions) {
    this.transport = isWebSocketLike(transport) ? new WebSocketTransport(transport) : transport;
    this.onError = opts?.onError;

    if (opts?.main !== undefined) this.main = new Client({ server: opts.main, tag: "local" });

    this.transport.onMessage((data) => {
      this.handleMessage(data);
    });
    this.transport.onClose((err) => {
      this.abort(err ?? new Error("connection closed"));
    });
  }

  /** Ask the remote vat for its bootstrap capability, returning a typed client for it. */

  bootstrap<C>(InterfaceClass: InterfaceCtor<C>): C {
    const q = this.newQuestion();
    const m = new Message();

    m.initRoot(RPCMessage).initBootstrap().setQuestionId(q.id);
    this.send(m);

    return new InterfaceClass.Client(q.pipelineClient([]));
  }

  close(): void {
    this.abort(new Error("connection closed"));
    this.transport.close();
  }

  /** Release one import table entry, notifying the peer. Called by Client.dispose. */

  releaseImport(id: number): void {
    const entry = this.imports.get(id);

    if (entry === undefined) return;

    const client = entry.ref.deref();

    if (client !== undefined) this.registry.unregister(client);

    this.imports.delete(id);
    this.sendRelease(id, entry.refs);
  }

  /** Send a Call for `method`; the returned RemotePromise resolves with its results. */

  sendCall<P extends Struct, R extends Struct, A extends RemotePromise<R>>(
    target: CallTarget,
    method: Method<P, R>,
    paramsFunc: ParamsInit<P> | undefined,
    PromiseClass: RemotePromiseCtor<R, A>,
  ): A {
    const q = this.newQuestion();
    const m = new Message();
    const call = m.initRoot(RPCMessage).initCall();

    call.setQuestionId(q.id);
    call.setInterfaceId(method.interfaceId);
    call.setMethodId(method.methodId);

    const callTarget = call.initTarget();

    if ("importedCap" in target) {
      callTarget.setImportedCap(target.importedCap);
    } else {
      const pa = callTarget.initPromisedAnswer();

      pa.setQuestionId(target.promisedAnswer.questionId);

      const ops = pa.initTransform(target.promisedAnswer.transform.length);

      target.promisedAnswer.transform.forEach((field, i) => ops.get(i).setGetPointerField(field));
    }

    const payload = call.initParams();
    const params = initStructAt(0, method.ParamsClass, payload);

    applyParams(paramsFunc, params);
    this.encodeCapTable(m, payload);
    this.send(m);

    return initRemotePromise(PromiseClass, {
      pipeline: (index) => q.pipelineClient([index]),
      promise: q.promise.then((payload) => getStruct(0, method.ResultsClass, payload)),
    });
  }

  private abort(err: Error): void {
    if (this.closed) return;
    this.closed = true;
    this.onError?.(err);
    for (const q of this.questions.values()) q.reject(err);
    this.questions.clear();
  }

  /** Turn a received Payload's capTable into clients on the message's cap table. */

  private decodeCapTable(m: Message, payload: Payload): void {
    if (isNull(getPointer(1, payload))) return;

    m._capnp.capTable = payload
      .getCapTable()
      .toArray()
      .map((d: CapDescriptor): Client | null => {
        switch (d.which()) {
          case CapDescriptor_Which.NONE:
            return null;

          case CapDescriptor_Which.SENDER_HOSTED:
            return this.importClient(d.getSenderHosted());

          case CapDescriptor_Which.SENDER_PROMISE:
            return this.importClient(d.getSenderPromise());

          case CapDescriptor_Which.RECEIVER_HOSTED:
            return this.exports.get(d.getReceiverHosted())?.client ?? brokenClient(RPC_UNKNOWN_EXPORT_ID);

          case CapDescriptor_Which.RECEIVER_ANSWER: {
            const pa = d.getReceiverAnswer();
            const answer = this.answers.get(pa.getQuestionId());

            if (answer === undefined) return brokenClient(RPC_UNKNOWN_ANSWER_ID);

            const transform = pa
              .getTransform()
              .toArray()
              .map((op) => op.getGetPointerField());

            return new Client({ answer, tag: "answer", transform });
          }

          default:
            return brokenClient(`unimplemented cap descriptor: ${CapDescriptor_Which[d.which()]}`);
        }
      });
  }

  private dispatchCall(
    answerId: number,
    entry: Answer,
    targetClient: Client,
    interfaceId: bigint,
    methodId: number,
    payload: Payload,
  ): void {
    void (async () => {
      const ret = new Message();
      const retRoot = ret.initRoot(RPCMessage).initReturn();

      retRoot.setAnswerId(answerId);

      try {
        const target = targetClient._target;

        if (target.tag === "broken") throw new Error(target.reason);
        if (target.tag !== "local") throw new Error("proxying calls is not implemented");

        const method = target.server.methods.find((s) => s.interfaceId === interfaceId && s.methodId === methodId);

        if (method === undefined) throw new Error(`no such method: ${interfaceId.toString(16)}/${methodId}`);

        const resultsPayload = retRoot.initResults();
        /* eslint-disable @typescript-eslint/no-unsafe-assignment */
        const params = getStruct(0, method.ParamsClass, payload);
        const results = initStructAt(0, method.ResultsClass, resultsPayload);
        /* eslint-enable @typescript-eslint/no-unsafe-assignment */

        await method.impl(params, results);

        this.encodeCapTable(ret, resultsPayload);
        entry.resolvePayload(resultsPayload);
        this.send(ret);
      } catch (err) {
        const reason = err instanceof Error ? err.message : String(err);

        retRoot.initException().setReason(reason);
        entry.rejectPayload(err instanceof Error ? err : new Error(reason));
        this.send(ret);
      }
    })().catch((err) => {
      // Unswallow unhandled errors in the catch branch above; unlikely but possible.
      throw new Error(String(err));
    });
  }

  /** Write the message's cap table out as a Payload.capTable of CapDescriptors. */

  private encodeCapTable(m: Message, payload: Payload): void {
    const caps = m._capnp.capTable;

    if (caps === undefined || caps.length === 0) return;

    const list = payload.initCapTable(caps.length);

    caps.forEach((client, i) => {
      const d = list.get(i);

      if (client === null) {
        d.setNone();
        return;
      }

      const target = client._target;

      switch (target.tag) {
        case "local":
          d.setSenderHosted(this.exportClient(client));
          break;

        case "import":
          if (target.conn === this) {
            d.setReceiverHosted(target.id);
          } else {
            // A capability from another connection: proxying (Level 3) is out of scope.
            d.setNone();
          }
          break;

        case "promised":
          if (target.question.conn === this) {
            const pa = d.initReceiverAnswer();

            pa.setQuestionId(target.question.id);

            const ops = pa.initTransform(target.transform.length);

            target.transform.forEach((op, j) => ops.get(j).setGetPointerField(op));
          } else {
            // A promise from another connection: proxying (Level 3) is out of scope.
            d.setNone();
          }
          break;

        default:
          d.setNone();
          break;
      }
    });
  }

  private exportClient(client: Client): number {
    let id = this.exportIds.get(client);

    if (id === undefined) {
      id = this.nextExportId++;
      this.exportIds.set(client, id);
      this.exports.set(id, { client, refs: 0 });
    }

    const entry = this.exports.get(id);

    if (entry !== undefined) entry.refs++;

    return id;
  }

  private handleBootstrap(questionId: number): void {
    const m = new Message();
    const ret = m.initRoot(RPCMessage).initReturn();

    ret.setAnswerId(questionId);

    const entry = new Answer();

    this.answers.set(questionId, entry);

    if (this.main === undefined) {
      ret.initException().setReason(RPC_NO_MAIN_INTERFACE);
      entry.rejectPayload(new Error(RPC_NO_MAIN_INTERFACE));
    } else {
      const payload = ret.initResults();
      const capId = m.addCap(this.main);

      setInterfacePointer(capId, getPointer(0, payload));
      this.encodeCapTable(m, payload);
      entry.resolvePayload(payload);
    }

    this.send(m);
  }

  private handleCall(m: Message, answerId: number): void {
    const call = m.getRoot(RPCMessage).getCall();
    const payload = call.getParams();

    this.decodeCapTable(m, payload);

    const target = call.getTarget();
    const interfaceId = call.getInterfaceId();
    const methodId = call.getMethodId();
    // The answer entry must exist before any later message referencing it is processed,
    // so it is registered synchronously even though dispatch may be deferred.
    const entry = new Answer();

    this.answers.set(answerId, entry);

    let targetClient: Promise<Client>;

    if (target.which() === MessageTarget_Which.IMPORTED_CAP) {
      targetClient = Promise.resolve(
        this.exports.get(target.getImportedCap())?.client ?? brokenClient(RPC_UNKNOWN_EXPORT_ID),
      );
    } else {
      const pa = target.getPromisedAnswer();
      const promised = this.answers.get(pa.getQuestionId());
      const transform = pa
        .getTransform()
        .toArray()
        .map((op) => op.getGetPointerField());

      targetClient =
        promised === undefined
          ? Promise.resolve(brokenClient(RPC_UNKNOWN_ANSWER_ID))
          : promised.payloadPromise.then(
              (answerPayload) => resolveCapability(answerPayload, transform),
              (err: Error) => brokenClient(err.message),
            );
    }

    this.deliveryChain = this.deliveryChain.then(
      () => targetClient.then((client) => this.dispatchCall(answerId, entry, client, interfaceId, methodId, payload)),
      () => undefined,
    );
  }

  /** Echo a sender-loopback Disembargo back as receiver-loopback, per the spec. */

  private handleDisembargo(d: Disembargo): void {
    const context = d.getContext();

    if (context.which() !== Disembargo_Context_Which.SENDER_LOOPBACK) return;

    const m = new Message();
    const reply = m.initRoot(RPCMessage).initDisembargo();

    reply.getContext().setReceiverLoopback(context.getSenderLoopback());

    const target = d.getTarget();
    const replyTarget = reply.initTarget();

    if (target.which() === MessageTarget_Which.IMPORTED_CAP) {
      replyTarget.setImportedCap(target.getImportedCap());
    } else {
      const pa = target.getPromisedAnswer();
      const replyPa = replyTarget.initPromisedAnswer();

      replyPa.setQuestionId(pa.getQuestionId());

      const ops = pa.getTransform().toArray();
      const replyOps = replyPa.initTransform(ops.length);

      ops.forEach((op, i) => replyOps.get(i).setGetPointerField(op.getGetPointerField()));
    }

    this.send(m);
  }

  private handleMessage(data: Uint8Array): void {
    const m = new Message(data, false);
    const root = m.getRoot(RPCMessage);

    switch (root.which()) {
      case Message_Which.BOOTSTRAP:
        this.handleBootstrap(root.getBootstrap().getQuestionId());
        break;

      case Message_Which.CALL:
        this.handleCall(m, root.getCall().getQuestionId());
        break;

      case Message_Which.RETURN:
        this.handleReturn(m);
        break;

      case Message_Which.FINISH:
        this.answers.delete(root.getFinish().getQuestionId());
        break;

      case Message_Which.RELEASE:
        this.handleRelease(root.getRelease().getId(), root.getRelease().getReferenceCount());
        break;

      case Message_Which.RESOLVE:
        // Promise imports keep routing through their original id in the two-party
        // case, so a Resolve requires no action here.
        break;

      case Message_Which.DISEMBARGO:
        this.handleDisembargo(root.getDisembargo());
        break;

      case Message_Which.ABORT: {
        const reason = root.getAbort().getReason();
        this.abort(new Error(reason));
        this.transport.close();
        break;
      }

      default:
        console.error(format("CAPNP-TS: unimplemented RPC message: %s", Message_Which[root.which()]));
        break;
    }
  }

  private handleRelease(id: number, count: number): void {
    const entry = this.exports.get(id);

    if (entry === undefined) return;

    entry.refs -= count;

    if (entry.refs <= 0) {
      this.exports.delete(id);
      this.exportIds.delete(entry.client);
    }
  }

  private handleReturn(m: Message): void {
    const ret = m.getRoot(RPCMessage).getReturn();
    const answerId = ret.getAnswerId();
    const q = this.questions.get(answerId);

    if (q === undefined) return;

    this.questions.delete(answerId);

    switch (ret.which()) {
      case Return_Which.RESULTS: {
        const payload = ret.getResults();

        this.decodeCapTable(m, payload);
        q.resolve(payload);
        break;
      }

      case Return_Which.EXCEPTION:
        q.reject(new Error(ret.getException().getReason()));
        break;

      default:
        q.reject(new Error(`unimplemented return: ${Return_Which[ret.which()]}`));
        break;
    }

    const finish = new Message();
    const f = finish.initRoot(RPCMessage).initFinish();

    f.setQuestionId(answerId);
    f.setReleaseResultCaps(false);
    this.send(finish);
  }

  private importClient(id: number): Client {
    const entry = this.imports.get(id);

    if (entry !== undefined) {
      const existing = entry.ref.deref();

      if (existing !== undefined) {
        entry.refs++;
        return existing;
      }

      // Client was GC'd but the finalizer hasn't fired yet; clean up the stale entry.
      this.imports.delete(id);
      this.sendRelease(id, entry.refs);
    }

    const client = new Client({ conn: this, id, tag: "import" });

    this.imports.set(id, { ref: new WeakRef(client), refs: 1 });
    this.registry.register(client, id, client);

    return client;
  }

  private newQuestion(): Question {
    const q = new Question(this, this.nextQuestionId++);

    this.questions.set(q.id, q);

    return q;
  }

  private send(m: Message): void {
    this.transport.send(new Uint8Array(m.toArrayBuffer()));
  }

  private sendRelease(id: number, count: number): void {
    const m = new Message();
    const release = m.initRoot(RPCMessage).initRelease();

    release.setId(id);
    release.setReferenceCount(count);
    this.send(m);
  }
}
