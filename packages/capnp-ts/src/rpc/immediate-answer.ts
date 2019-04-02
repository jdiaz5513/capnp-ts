import { FixedAnswer } from "./fixed-answer";
import { Struct } from "../serialization/pointers/struct";
import { PipelineOp } from "./pipeline-op";
import { Client } from "./client";
import { transformPtr } from "./transform-ptr";
import { Call } from "./call";
import { Answer } from "./answer";
import { clientOrNull } from "./error-client";
import { interfaceToClient, pointerToInterface } from "./interface";

export class ImmediateAnswer<R extends Struct> extends FixedAnswer<R> {
  s: R;

  constructor(s: R) {
    super();
    this.s = s;
  }

  structSync() {
    return this.s;
  }

  findClient(transform: PipelineOp[]): Client {
    const p = transformPtr(this.s, transform);
    return clientOrNull(interfaceToClient(pointerToInterface(p)));
  }

  pipelineCall<CallParams extends Struct, CallResults extends Struct>(
    transform: PipelineOp[],
    call: Call<CallParams, CallResults>
  ): Answer<CallResults> {
    return this.findClient(transform).call(call);
  }

  pipelineClose(transform: PipelineOp[]): void {
    this.findClient(transform).close();
  }
}
