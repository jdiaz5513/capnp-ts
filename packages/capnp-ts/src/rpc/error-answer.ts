import { FixedAnswer } from "./fixed-answer";
import { Struct } from "../serialization/pointers/struct";
import { PipelineOp } from "./pipeline-op";
import { Call } from "./call";
import { Answer } from "./answer";

export class ErrorAnswer<T extends Struct> extends FixedAnswer<T> {
  err: Error;

  constructor(err: Error) {
    super();
    this.err = err;
  }

  structSync(): T {
    throw this.err;
  }

  pipelineCall<CallParams extends Struct, CallResult extends Struct>(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _transform: PipelineOp[],
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _call: Call<CallParams, CallResult>
  ): Answer<CallResult> {
    // doesn't matter, it's still going to err
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-explicit-any
    return this as any;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  pipelineClose(_transform: PipelineOp[]): void {
    throw this.err;
  }
}
