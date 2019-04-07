import { Method } from "./method";
import { Struct } from "../serialization/pointers/struct";

export class MethodError<P extends Struct, R extends Struct> extends Error {
  method: Method<P, R>;

  constructor(method: Method<P, R>, message: string) {
    super(
      `rpc method exception: ${method.interfaceName}.${
        method.methodName
      }: ${message}`
    );
    this.method = method;
  }
}
