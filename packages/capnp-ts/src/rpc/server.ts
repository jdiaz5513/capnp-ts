import { Method } from "./method";
import { Struct } from "../serialization/pointers/struct";
import { Message } from "../serialization/message";
import { DataCall, Call, copyCall } from "./call";
import { Fulfiller } from "./fulfiller/fulfiller";
import { Client } from "./client";
import { Answer } from "./answer";
import { ErrorAnswer } from "./error-answer";
import { MethodError } from "./method-error";
import { RPC_UNIMPLEMENTED } from "../errors";

export interface ServerMethod<P extends Struct, R extends Struct>
  extends Method<P, R> {
  impl(params: P, results: R): Promise<void>;
}

export interface ServerCall<P extends Struct, R extends Struct>
  extends DataCall<P, R> {
  serverMethod: ServerMethod<P, R>;
  answer: Fulfiller<R>;
}

// A server is a locally implemented interface
export class Server implements Client {
  // tslint:disable-next-line:no-any
  methods: Array<ServerMethod<any, any>>;

  // tslint:disable-next-line:no-any
  constructor(methods: Array<ServerMethod<any, any>>) {
    this.methods = methods;
  }

  startCall<P extends Struct, R extends Struct>(call: ServerCall<P, R>) {
    const msg = new Message();
    const results = msg.initRoot(call.method.ResultsClass);
    call.serverMethod
      .impl(call.params, results)
      .then(() => call.answer.fulfill(results))
      .catch(err => call.answer.reject(err as any)); // tslint:disable-line:no-any
  }

  call<P extends Struct, R extends Struct>(call: Call<P, R>): Answer<R> {
    const serverMethod = this.methods[call.method.methodId];
    if (!serverMethod) {
      return new ErrorAnswer(new MethodError(call.method, RPC_UNIMPLEMENTED));
    }
    const serverCall: ServerCall<P, R> = {
      ...copyCall(call),
      answer: new Fulfiller<R>(),
      serverMethod
    };
    this.startCall(serverCall);
    return serverCall.answer;
  }

  close(): void {
    // muffin
  }
}
