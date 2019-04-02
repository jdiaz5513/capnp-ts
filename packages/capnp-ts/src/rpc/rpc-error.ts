import { Exception } from "../std/rpc.capnp";

export class RPCError extends Error {
  exception: Exception;

  constructor(exception: Exception) {
    super(`rpc exception: ${exception.getReason()}`);
    this.exception = exception;
  }
}
