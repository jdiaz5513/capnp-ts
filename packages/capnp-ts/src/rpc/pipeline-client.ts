import { Pipeline } from "./pipeline";
import { Struct } from "../serialization/pointers/struct";
import { Client } from "./client";
import { PipelineOp } from "./pipeline-op";
import { Call } from "./call";
import { Answer } from "./answer";

/**
 * PipelineClient implements Client by calling to the pipeline's answer.
 */
export class PipelineClient<
  AnswerResults extends Struct,
  ParentResults extends Struct,
  Results extends Struct
> implements Client {
  pipeline: Pipeline<AnswerResults, ParentResults, Results>;

  constructor(pipeline: Pipeline<AnswerResults, ParentResults, Results>) {
    this.pipeline = pipeline;
  }

  transform(): PipelineOp[] {
    return this.pipeline.transform();
  }

  call<CallParams extends Struct, CallResults extends Struct>(
    call: Call<CallParams, CallResults>
  ): Answer<CallResults> {
    return this.pipeline.answer.pipelineCall(this.transform(), call);
  }

  close() {
    this.pipeline.answer.pipelineClose(this.transform());
  }
}
