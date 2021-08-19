import { Client } from "./client";
import { RefCount } from "./refcount";
import { finalize } from "./finalize";
import { Struct } from "../serialization/pointers/struct";
import { Call } from "./call";
import { Answer } from "./answer";

// A Ref is a single reference to a client wrapped by RefCount.
export class Ref implements Client {
  rc: RefCount;
  closeState: { closed: boolean };

  constructor(rc: RefCount) {
    this.rc = rc;
    const closeState = { closed: false };
    this.closeState = closeState;
    finalize(this, () => {
      if (!closeState.closed) {
        closeState.closed = true;
        rc.decref();
      }
    });
  }

  call<P extends Struct, R extends Struct>(cl: Call<P, R>): Answer<R> {
    return this.rc.call(cl);
  }

  client(): Client {
    return this.rc._client;
  }

  close() {
    if (!this.closeState.closed) {
      this.closeState.closed = true;
      this.rc.decref();
    }
  }
}
