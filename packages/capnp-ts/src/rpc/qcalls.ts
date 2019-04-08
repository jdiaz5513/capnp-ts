import { AnswerQCall } from "./answer";

export type QCallSlot = AnswerQCall | null;

export class Qcalls {
  data: QCallSlot[];

  constructor(data: QCallSlot[]) {
    this.data = data;
  }

  static copyOf(data: QCallSlot[]) {
    return new Qcalls([...data]);
  }

  len() {
    return this.data.length;
  }

  clear(i: number) {
    this.data[i] = null;
  }

  copy(): Qcalls {
    return Qcalls.copyOf(this.data);
  }
}
