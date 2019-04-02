import { PipelineOp } from "./pipeline-op";
import { PromisedAnswer, PromisedAnswer_Op } from "../std/rpc.capnp";
import { List } from "../../lib/serialization/pointers/list";

export function transformToPromisedAnswer(
  answer: PromisedAnswer,
  transform: PipelineOp[]
) {
  const opList = answer.initTransform(transform.length);
  for (let i = 0; i < transform.length; i++) {
    const op = transform[i];
    opList.get(i).setGetPointerField(op.field);
  }
}

export function promisedAnswerOpsToTransform(
  list: List<PromisedAnswer_Op>
): PipelineOp[] {
  const transform: PipelineOp[] = [];
  list.forEach(op => {
    switch (op.which()) {
      case PromisedAnswer_Op.GET_POINTER_FIELD: {
        transform.push(<PipelineOp>{
          field: op.getGetPointerField()
        });
        break;
      }
      case PromisedAnswer_Op.NOOP: {
        // no-op
        break;
      }
      default: {
        // nothing
      }
    }
  });
  return transform;
}
