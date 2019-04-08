import { Struct } from "../serialization/pointers/struct";
import { PipelineOp } from "./pipeline-op";
import { Call, copyCall } from "./call";
import { Conn } from "./conn";
import { Deferred } from "./deferred";
import { MessageTarget } from "../std/rpc.capnp";
import { Fulfiller } from "./fulfiller/fulfiller";
import { newReturnMessage, setReturnException } from "./capability";
import { Pointer } from "../serialization/pointers/pointer";
import { transformPtr } from "./transform-ptr";
import { Interface } from "../serialization/pointers/interface";
import { RPC_NULL_CLIENT, RPC_UNIMPLEMENTED } from "../errors";
import { QueueClient, callQueueSize } from "./queue-client";
import { RPC_CALL_QUEUE_FULL } from "../../lib/errors";

// An Answer is the deferred result of a client call, which is usually wrapped
// by a Pipeline.
export interface Answer<R extends Struct> {
  // struct waits until the call is finished and returns the result.
  struct(): Promise<R>;

  // The following methods are the same as in Client except with an added
  // transform parameter -- a path to the interface to use.
  pipelineCall<CallParams extends Struct, CallResults extends Struct>(
    transform: PipelineOp[],
    call: Call<CallParams, CallResults>
  ): Answer<CallResults>;
  pipelineClose(transform: PipelineOp[]): void;
}

export class AnswerEntry<R extends Struct> {
  id: number;
  conn: Conn;
  resultCaps: number[] = [];

  done = false;
  obj?: R;
  err?: Error;
  deferred = new Deferred<R>();
  queue: AnswerPCall[] = [];

  constructor(conn: Conn, id: number) {
    this.conn = conn;
    this.id = id;
  }

  // fulfill is called to resolve an answer successfully.
  fulfill(obj: R) {
    if (this.done) {
      throw new Error(`answer.fulfill called more than once`);
    }

    this.obj = obj;

    const retmsg = newReturnMessage(this.id);
    const ret = retmsg.getReturn();
    const payload = ret.initResults();
    payload.setContent(obj);

    let firstErr: Error | undefined;
    try {
      this.conn.makeCapTable(ret.segment, len => payload.initCapTable(len));
      this.conn.sendMessage(retmsg);
    } catch (err) {
      if (!firstErr) {
        // tslint:disable-next-line:no-unsafe-any
        firstErr = err;
      }
    }

    const [queues, queuesErr] = this.emptyQueue(obj);
    if (queuesErr && !firstErr) {
      firstErr = queuesErr;
    }

    const objcap = obj.segment.message._capnp;
    if (!objcap.capTable) {
      objcap.capTable = [];
    }
    for (const capIdxStr of Object.keys(queues)) {
      const capIdx = Number(capIdxStr);
      const q = queues[capIdx];
      objcap.capTable[capIdx] = new QueueClient(
        this.conn,
        objcap.capTable[capIdx]!, // tslint:disable-line
        q
      );
    }

    if (firstErr) {
      throw firstErr;
    }
  }

  // reject is called to resolve an answer with failure.
  reject(err: Error) {
    if (!err) {
      throw new Error(`answer.reject called with nil`);
    }
    if (this.done) {
      throw new Error(`answer.reject claled more than once`);
    }

    const m = newReturnMessage(this.id);
    const mret = m.getReturn();
    setReturnException(mret, err);

    this.err = err;
    this.done = true;
    this.deferred.reject(err);

    let firstErr: Error | undefined;
    try {
      this.conn.sendMessage(m);
    } catch (e) {
      // tslint:disable-next-line:no-unsafe-any
      firstErr = e;
    }

    for (let i = 0; i < this.queue.length; i++) {
      const qa = this.queue[i];
      try {
        if (qa.qcall && isRemoteCall(qa.qcall)) {
          qa.qcall.a.reject(err);
        }
      } catch (e) {
        if (!firstErr) {
          // tslint:disable-next-line:no-unsafe-any
          firstErr = e;
        }
      }
    }
    this.queue = [];

    if (firstErr) {
      throw firstErr;
    }
  }

  // emptyQueue splits the queue by which capability it targets
  // and drops any invalid calls. Once this function returns,
  // this.queue will be empty.
  emptyQueue(obj: R): [{ [key: number]: AnswerQCall[] }, Error | undefined] {
    let firstErr: Error | undefined;
    const qs: { [key: number]: AnswerQCall[] } = {};

    for (let i = 0; i < this.queue.length; i++) {
      const pc = this.queue[i];
      if (!isRemoteCall(pc.qcall)) {
        continue;
      }

      if (!pc.qcall.a) {
        continue;
      }

      let c: Pointer;
      try {
        c = transformPtr(obj, pc.transform);
      } catch (err) {
        try {
          // tslint:disable-next-line:no-unsafe-any
          pc.qcall.a.reject(err);
        } catch (err) {
          if (!firstErr) {
            // tslint:disable-next-line:no-unsafe-any
            firstErr = err;
          }
        }
        continue;
      }

      const ci = Interface.fromPointer(c);
      if (!ci) {
        try {
          pc.qcall.a.reject(new Error(RPC_NULL_CLIENT));
        } catch (err) {
          if (!firstErr) {
            // tslint:disable-next-line:no-unsafe-any
            firstErr = err;
          }
        }
        continue;
      }

      const cn = ci.getCapId();
      if (!qs[cn]) {
        qs[cn] = [];
      }
      qs[cn].push(pc.qcall);
    }

    this.queue = [];
    return [qs, firstErr];
  }

  queueCall<P extends Struct, R extends Struct>(
    call: Call<P, R>,
    transform: PipelineOp[],
    a: AnswerEntry<R>
  ) {
    if (this.queue.length >= callQueueSize) {
      throw new Error(RPC_CALL_QUEUE_FULL);
    }

    const qcall: QCallRemoteCall = {
      a,
      call: copyCall(call)
    };
    const pcall: AnswerPCall = {
      qcall,
      transform
    };
    this.queue.push(pcall);
  }
}

export type AnswerQCall = QCallRemoteCall | QCallLocalCall | QCallDisembargo;

export interface QCallRemoteCall {
  // tslint:disable-next-line:no-any
  call: Call<any, any>;

  // tslint:disable-next-line:no-any
  a: AnswerEntry<any>; // defined if remote call
}

export interface QCallLocalCall {
  // tslint:disable-next-line:no-any
  call: Call<any, any>;

  // tslint:disable-next-line:no-any
  f: Fulfiller<any>; // defined if local call
}

export interface QCallDisembargo {
  embargoID: number;
  embargoTarget: MessageTarget;
}

export function isRemoteCall(a: AnswerQCall): a is QCallRemoteCall {
  return !!(a as QCallRemoteCall).a;
}

export function isLocalCall(a: AnswerQCall): a is QCallLocalCall {
  return !!(a as QCallLocalCall).f;
}

export function isDisembargo(a: AnswerQCall): a is QCallDisembargo {
  return !!(a as QCallDisembargo).embargoTarget;
}

export interface AnswerPCall {
  qcall: AnswerQCall;
  transform: PipelineOp[];
}
