import { PipelineOp } from "../pipeline-op";
import { Fulfiller } from "./fulfiller";
import { Call } from "../call";
import { Struct } from "../../serialization/pointers/struct";

// ecall is a queued embargoed call
export interface ecall {
  // tslint:disable-next-line:no-any
  call: Call<any, any>;
  // tslint:disable-next-line:no-any
  f: Fulfiller<any>;
}

// pcall is a queued pipeline call
export interface pcall extends ecall {
  transform: PipelineOp[];
}

// tslint:disable-next-line:no-any
export type ecallSlot = ecall | null;

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
