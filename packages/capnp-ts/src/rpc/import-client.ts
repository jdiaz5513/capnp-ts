import { Conn } from "./conn";
import { Client } from "./client";
import { Struct } from "../serialization/pointers/struct";
import { Call } from "./call";
import { Answer } from "./answer";
import { ErrorAnswer } from "./error-answer";
import { newMessage } from "./capability";
import { RPC_IMPORT_CLOSED } from "../errors";

// An ImportClient implements Client for a remote capability.
export class ImportClient implements Client {
  conn: Conn;
  id: number;
  closed = false;

  constructor(conn: Conn, id: number) {
    this.conn = conn;
    this.id = id;
  }

  call<CallParams extends Struct, CallResults extends Struct>(
    cl: Call<CallParams, CallResults>
  ): Answer<CallResults> {
    if (this.closed) {
      return new ErrorAnswer(new Error(RPC_IMPORT_CLOSED));
    }

    const q = this.conn.newQuestion(cl.method);
    const msg = newMessage();
    const msgCall = msg.initCall();
    msgCall.setQuestionId(q.id);
    msgCall.setInterfaceId(cl.method.interfaceId);
    msgCall.setMethodId(cl.method.methodId);
    const target = msgCall.initTarget();
    target.setImportedCap(this.id);
    const payload = msgCall.initParams();
    this.conn.fillParams(payload, cl);
    // TODO: handle thrown exceptions here?

    this.conn.sendMessage(msg);
    // TODO: what about q.start()?
    return q;
  }

  close() {
    // TODO: figure out
  }
}
