import { Client } from "./client";
import { Struct } from "../serialization/pointers/struct";
import { Call } from "./call";
import { Answer } from "./answer";
import { ErrorClient } from "./error-client";
import { RPC_ZERO_REF } from "../errors";
import { Ref } from "./ref";

/**
 * A RefCount will close its underlying client once all its references are
 * closed.
 */
export class RefCount implements Client {
  refs: number;
  _client: Client;

  private constructor(c: Client) {
    this._client = c;
    this.refs = 1;
  }

  // New creates a reference counter and the first client reference.
  static new(c: Client): [RefCount, Ref] {
    const rc = new RefCount(c);
    const ref = rc.newRef();
    return [rc, ref];
  }

  call<P extends Struct, R extends Struct>(cl: Call<P, R>): Answer<R> {
    return this._client.call(cl);
  }

  client(): Client {
    return this._client;
  }

  close() {
    this._client.close();
  }

  ref(): Client {
    if (this.refs <= 0) {
      return new ErrorClient(new Error(RPC_ZERO_REF));
    }
    this.refs++;
    return this.newRef();
  }

  newRef(): Ref {
    return new Ref(this);
  }

  decref() {
    this.refs--;
    if (this.refs === 0) {
      this._client.close();
    }
  }
}
