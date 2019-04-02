import { Client } from "./client";
import { RPC_NULL_CLIENT } from "../errors";
import { Answer } from "./answer";
import { Struct } from "../serialization/pointers/struct";
import { Call } from "./call";

export class ErrorClient implements Client {
  err: Error;

  constructor(err: Error) {
    this.err = err;
  }

  call<P extends Struct, R extends Struct>(_call: Call<P, R>): Answer<R> {
    // FIXME: ErrorAnswer ?
    throw this.err;
  }

  close() {
    throw this.err;
  }
}

export function clientOrNull(client: Client | null): Client {
  return client ? client : new ErrorClient(new Error(RPC_NULL_CLIENT));
}
