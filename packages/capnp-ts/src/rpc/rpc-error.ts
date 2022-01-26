import { RPC_ERROR } from "../errors";
import { Exception } from "../std/rpc.capnp";
import { format } from "../util";

export class RPCError extends Error {
  exception: Exception;

  constructor(exception: Exception) {
    super(format(RPC_ERROR, exception.getReason()));
    this.exception = exception;
  }
}

export function toException(exc: Exception, err: Error): void {
  if (err instanceof RPCError) {
    exc.setReason(exc.getReason());
    exc.setType(exc.getType());
    return;
  }
  exc.setReason(err.message);
  exc.setType(Exception.Type.FAILED);
}
