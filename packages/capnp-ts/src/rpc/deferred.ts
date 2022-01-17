// export class Deferred<T> {
//   promise: Promise<T>;
//   resolve!: (t: T) => void;
//   reject!: (err: Error) => void;

import initTrace from "debug";

const trace = initTrace("capnp:rpc:deferred");

//   constructor() {
//     this.promise = new Promise((resolve, reject) => {
//       this.resolve = resolve;
//       this.reject = reject;
//     });
//   }
// }

export class Deferred<T> {
  static fromPromise<T>(p: Promise<T>): Deferred<T> {
    const d = new Deferred<T>();
    p.then(d.resolve, d.reject);
    return d;
  }

  promise: Promise<T>;
  reject!: (reason?: unknown) => void;
  resolve!: (value: T | PromiseLike<T>) => void;

  constructor() {
    this.promise = new Promise((a, b) => {
      this.resolve = a;
      this.reject = b;
    });
  }
}
