import { AnswerQCall } from "./answer";

export type QCallSlot = AnswerQCall | null;

export class Qcalls {
  data: QCallSlot[];

  constructor(data: QCallSlot[]) {
    this.data = data;
  }

  static copyOf(data: QCallSlot[]): Qcalls {
    return new Qcalls([...data]);
  }

  len(): number {
    return this.data.length;
  }

  clear(i: number): void {
    this.data[i] = null;
  }

  copy(): Qcalls {
    return Qcalls.copyOf(this.data);
  }
}
