import { Method } from "./method";
import { Struct } from "../serialization/pointers/struct";
import { Exception } from "../std/rpc.capnp";

export class MethodError<P extends Struct, R extends Struct> extends Error {
  method: Method<P, R>;
  exception: Exception;

  constructor(method: Method<P, R>, exception: Exception) {
    super(
      `rpc method exception: ${method.interfaceName}.${
        method.methodName
      }: ${exception.getReason()}`
    );
    this.method = method;
    this.exception = exception;
  }
}
