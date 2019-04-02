import { Struct } from "../serialization/pointers/struct";
import { PipelineOp } from "./pipeline-op";
import { Call } from "./call";
import { Conn } from "./conn";
import { Deferred } from "./deferred";
import { MessageTarget } from "../std/rpc.capnp";
import { Fulfiller } from "./fulfiller/fulfiller";

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

export interface AnswerEntry<R> {
  id: number;
  resultCaps: number[];
  conn: Conn;

  done: boolean;
  obj?: R;
  err?: Error;
  deferred: Deferred<R>;
  queue: pcall[];
}

interface qcall {
  // tslint:disable-next-line:no-any
  a?: Answer<any>; // defined if remote call
  // tslint:disable-next-line:no-any
  f?: Fulfiller<any>; // defined if local call
  // tslint:disable-next-line:no-any
  call: Call<any, any>;

  // disembargo
  embargoID: number;
  embargoTarget: MessageTarget;
}

interface pcall extends qcall {
  transform: PipelineOp[];
}
