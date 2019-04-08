import { Exception } from "../std/rpc.capnp";

export class RPCError extends Error {
  exception: Exception;

  constructor(exception: Exception) {
    super(`rpc exception: ${exception.getReason()}`);
    this.exception = exception;
  }
}

export function toException(exc: Exception, err: Error) {
  if (err instanceof RPCError) {
    exc.setReason(exc.getReason());
    exc.setType(exc.getType());
    return;
  }
  exc.setReason(err.message);
  exc.setType(Exception.Type.FAILED);
}
