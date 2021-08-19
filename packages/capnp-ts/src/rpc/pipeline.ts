import { PipelineClient } from "./pipeline-client";
import { Struct, StructCtor } from "../serialization/pointers/struct";
import { Answer } from "./answer";
import { PipelineOp } from "./pipeline-op";
import { transformPtr } from "./transform-ptr";
import { Pointer } from "../serialization/pointers/pointer";

// TODO: figure out if we can respect no-any.
// It doesn't appear so because PipelineOp has just
// a field index, so we have no typing information.

/**
 * A Pipeline is a generic wrapper for an answer
 */
export class Pipeline<
  AnswerResults extends Struct,
  ParentResults extends Struct,
  Results extends Struct
> {
  ResultsClass: StructCtor<Results>;
  answer: Answer<AnswerResults>;
  op: PipelineOp;
  parent?: Pipeline<AnswerResults, Struct, ParentResults>;
  pipelineClient?: PipelineClient<AnswerResults, ParentResults, Results>;

  // Returns a new Pipeline based on an answer
  constructor(
    ResultsClass: StructCtor<Results>,
    answer: Answer<AnswerResults>,
    op: PipelineOp = { field: 0 },
    parent?: Pipeline<AnswerResults, Struct, ParentResults>
  ) {
    this.ResultsClass = ResultsClass;
    this.answer = answer;
    this.op = op;
    this.parent = parent;
  }

  // transform returns the operations needed to transform the root answer
  // into the value p represents.
  transform(): PipelineOp[] {
    const xform: PipelineOp[] = [];
    for (
      let q: Pipeline<any, any, any> | null = this; // tslint:disable-line:no-any
      q.parent;
      q = q.parent
    ) {
      xform.unshift(q.op);
    }
    return xform;
  }

  // Struct waits until the answer is resolved and returns the struct
  // this pipeline represents.
  async struct(): Promise<Results | null> {
    const s = await this.answer.struct();
    const ptr = transformPtr(s, this.transform());
    if (!ptr) {
      return null;
    }
    return Struct.getAs(this.ResultsClass, ptr);
  }

  // client returns the client version of this pipeline
  client(): PipelineClient<AnswerResults, ParentResults, Results> {
    if (!this.pipelineClient) {
      this.pipelineClient = new PipelineClient(this);
    }
    return this.pipelineClient;
  }

  // getPipeline returns a derived pipeline which yields the pointer field given
  getPipeline<RR extends Struct>(
    ResultsClass: StructCtor<RR>,
    off: number,
    defaultValue?: Pointer
  ): Pipeline<AnswerResults, Results, RR> {
    return new Pipeline(
      ResultsClass,
      this.answer,
      <PipelineOp>{ field: off, defaultValue },
      this
    );
  }
}
