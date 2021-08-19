import { Struct } from "../serialization/pointers/struct";
import { Answer } from "./answer";
import { Conn } from "./conn";
import { Method } from "./method";
import { PipelineOp } from "./pipeline-op";
import { Deferred } from "./deferred";
import { Call } from "./call";
import { clientFromResolution } from "./client";
import { newMessage } from "./capability";
import { transformToPromisedAnswer } from "./promised-answer";
import { Pointer } from "../serialization/pointers/pointer";

export enum QuestionState {
  IN_PROGRESS,
  RESOLVED,
  CANCELED
}

export class Question<P extends Struct, R extends Struct> implements Answer<R> {
  conn: Conn;
  id: number;
  method?: Method<P, R>;
  paramCaps: number[] = [];
  state = QuestionState.IN_PROGRESS;
  obj?: R;
  err?: Error;
  derived: PipelineOp[][] = [];
  deferred = new Deferred<R>();

  constructor(conn: Conn, id: number, method?: Method<P, R>) {
    this.conn = conn;
    this.id = id;
    this.method = method;
  }

  async struct(): Promise<R> {
    return await this.deferred.promise;
  }

  // start signals the question has been sent
  start() {
    // TODO: send finishMessage in case it gets cancelled
    // tslint:disable-next-line:max-line-length
    // see https://sourcegraph.com/github.com/capnproto/go-capnproto2@e1ae1f982d9908a41db464f02861a850a0880a5a/-/blob/rpc/question.go#L77
  }

  // fulfill is called to resolve a question successfully.
  // The caller must be holding onto q.conn.mu.
  fulfill(obj: Pointer) {
    // tslint:disable-next-line:max-line-length
    // TODO: derived, see https://sourcegraph.com/github.com/capnproto/go-capnproto2@e1ae1f982d9908a41db464f02861a850a0880a5a/-/blob/rpc/question.go#L105
    if (this.state !== QuestionState.IN_PROGRESS) {
      throw new Error(`question.fulfill called more than once`);
    }
    if (this.method) {
      this.obj = Struct.getAs(this.method.ResultsClass, obj);
    } else {
      // ugly, but when bootstrapping, method is null
      this.obj = obj as R;
    }
    this.state = QuestionState.RESOLVED;
    this.deferred.resolve(this.obj);
  }

  // reject is called to resolve a question with failure
  reject(err: Error) {
    if (!err) {
      throw new Error(`Question.reject called with null`);
    }
    if (this.state !== QuestionState.IN_PROGRESS) {
      throw new Error(`Question.reject called more than once`);
    }
    this.err = err;
    this.state = QuestionState.RESOLVED;
    this.deferred.reject(err);
  }

  // cancel is called to resolve a question with cancellation.
  cancel(err: Error): boolean {
    if (this.state === QuestionState.IN_PROGRESS) {
      this.err = err;
      this.state = QuestionState.CANCELED;
      this.deferred.reject(err);
      return true;
    }
    return false;
  }

  pipelineCall<CallParams extends Struct, CallResults extends Struct>(
    transform: PipelineOp[],
    ccall: Call<CallParams, CallResults>
  ): Answer<CallResults> {
    if (this.conn.findQuestion<P, R>(this.id) !== this) {
      if (this.state === QuestionState.IN_PROGRESS) {
        throw new Error(`question popped but not done`);
      }

      const client = clientFromResolution(transform, this.obj, this.err);
      // TODO: check that this is fine - this was conn.lockedCall
      return client.call(ccall);
    }

    const pipeq = this.conn.newQuestion(ccall.method);
    const msg = newMessage();
    const msgCall = msg.initCall();
    msgCall.setQuestionId(pipeq.id);
    msgCall.setInterfaceId(ccall.method.interfaceId);
    msgCall.setMethodId(ccall.method.methodId);
    const target = msgCall.initTarget();
    const a = target.initPromisedAnswer();
    a.setQuestionId(this.id);
    transformToPromisedAnswer(a, transform);
    const payload = msgCall.initParams();
    this.conn.fillParams(payload, ccall);
    this.conn.transport.sendMessage(msg);
    this.addPromise(transform);
    return pipeq;
  }

  addPromise(transform: PipelineOp[]) {
    for (const d of this.derived) {
      if (transformsEqual(transform, d)) {
        return;
      }
    }
    this.derived.push(transform);
  }

  pipelineClose() {
    throw new Error(`stub!`);
  }
}

export function transformsEqual(t: PipelineOp[], u: PipelineOp[]): boolean {
  if (t.length !== u.length) {
    return false;
  }

  for (let i = 0; i < t.length; i++) {
    if (t[i].field !== u[i].field) {
      return false;
    }
  }
  return true;
}
