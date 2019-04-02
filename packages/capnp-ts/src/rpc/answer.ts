import { Struct } from "../serialization/pointers/struct";
import { PipelineOp } from "./pipeline-op";
import { Call } from "./call";

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
