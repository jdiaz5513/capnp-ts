// IDGen returns a sequence of monotonically increasing IDs
// with support for replacement.
export class IDGen {
  i = 0;
  free: number[] = [];

  next() {
    let ret = this.free.pop();
    if (typeof ret === "undefined") {
      ret = this.i++;
    }
    return ret;
  }

  remove(i: number) {
    this.free.push(i);
  }
}
