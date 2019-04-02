import { PipelineOp } from "../pipeline-op";
import { Fulfiller } from "./fulfiller";
import { Call } from "../call";
import { Struct } from "../../serialization/pointers/struct";

// ecall is a queued embargoed call
export interface ecall<
  FulfillerResult extends Struct,
  CallParams extends Struct,
  CallResult extends Struct
> {
  call: Call<CallParams, CallResult>;
  f: Fulfiller<FulfillerResult>;
}

// pcall is a queued pipeline call
export interface pcall<
  FulfillerResult extends Struct,
  CallParams extends Struct,
  CallResult extends Struct
> extends ecall<FulfillerResult, CallParams, CallResult> {
  transform: PipelineOp[];
}

// tslint:disable-next-line:no-any
export type pcallAny = pcall<any, any, any>;

// tslint:disable-next-line:no-any
export type ecallSlot = ecall<any, any, any> | null;

export class Ecalls {
  data: ecallSlot[];

  constructor(data: ecallSlot[]) {
    this.data = data;
  }

  static copyOf(data: ecallSlot[]) {
    return new Ecalls([...data]);
  }

  len() {
    return this.data.length;
  }

  clear(i: number) {
    this.data[i] = null;
  }

  copy(): Ecalls {
    return Ecalls.copyOf(this.data);
  }
}
