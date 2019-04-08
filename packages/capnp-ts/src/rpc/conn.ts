import { IDGen } from "./idgen";
import { RefCount } from "./refcount";
import { Client, isSameClient, clientFromResolution } from "./client";
import { Transport } from "./transport";
import { Question, QuestionState } from "./question";
import {
  Message_Which,
  Return,
  Return_Which,
  Payload,
  CapDescriptor,
  CapDescriptor_Which,
  MessageTarget_Which,
  MessageTarget
} from "../std/rpc.capnp";
import { RPCError } from "./rpc-error";
import { AnswerEntry, Answer } from "./answer";
import {
  newMessage,
  newFinishMessage,
  newUnimplementedMessage
} from "./capability";
import { Pipeline } from "./pipeline";
import { Struct, StructCtor } from "../serialization/pointers/struct";
import {
  promisedAnswerOpsToTransform,
  transformToPromisedAnswer
} from "./promised-answer";
import { Method } from "./method";
import { PipelineOp } from "./pipeline-op";
import { ImportClient } from "./import-client";
import { Call, placeParams } from "./call";
import { Segment } from "../serialization/segment";
import { List } from "../serialization/pointers/list";
import { Ref } from "./ref";
import { PipelineClient } from "./pipeline-client";
import { FixedAnswer } from "./fixed-answer";
import { LocalAnswerClient } from "./local-answer-client";
import initTrace from "debug";
import { Finalize } from "./finalize";
import { RPCMessage } from "./rpc-message";
import { MethodError } from "./method-error";
import { Registry } from "./registry";
import { joinAnswer } from "./join";
import { INVARIANT_UNREACHABLE_CODE, RPC_BAD_TARGET } from "../errors";

const trace = initTrace("capnp:rpc:conn");
trace("load");

// tslint:disable-next-line:no-any
type QuestionSlot = Question<any, any> | null;

export class Conn {
  transport: Transport;
  finalize: Finalize;

  questionID = new IDGen();
  questions = [] as QuestionSlot[];

  exportID = new IDGen();
  exports = [] as Array<Export | null>;

  imports = {} as { [key: number]: ImportEntry };
  // tslint:disable-next-line:no-any
  answers = {} as { [key: number]: AnswerEntry<any> };

  onError?: (err: Error) => void;

  /**
   * Create a new connection
   * @param {Transport} transport The transport used to receive/send messages.
   * @param {Finalize} finalize Weak reference implementation. Compatible with
   * the 'weak' module on node.js (just add weak as a dependency and pass
   * require("weak")), but alternative implementations can be provided for
   * other platforms like Electron.
   * @returns {Conn} A new connection.
   */
  constructor(transport: Transport, finalize: Finalize) {
    this.transport = transport;
    this.finalize = finalize;
    this.questionID = new IDGen();
    this.questions = [];

    this.startWork();
  }

  async bootstrap(): Promise<Client> {
    const q = this.newQuestion();
    const msg = newMessage();
    const boot = msg.initBootstrap();
    boot.setQuestionId(q.id);

    this.sendMessage(msg);
    // TODO: relint
    // tslint:disable-next-line:no-any
    return new Pipeline(Struct as any, q).client();
  }

  startWork() {
    this.work().catch(e => {
      if (this.onError) {
        // tslint:disable-next-line:no-unsafe-any
        this.onError(e);
      } else {
        // FIXME: that's no good
        // tslint:disable-next-line:no-console
        console.log(
          `Cap'n Proto RPC error: `,
          e instanceof Error ? e.stack : e
        );
      }
    });
  }

  handleMessage(m: RPCMessage) {
    switch (m.which()) {
      case RPCMessage.UNIMPLEMENTED: {
        // no-op for now to avoid feedback loop
        break;
      }
      case RPCMessage.ABORT: {
        this.shutdown(new RPCError(m.getAbort()));
        break;
      }
      case RPCMessage.RETURN: {
        this.handleReturnMessage(m);
        break;
      }
      case RPCMessage.CALL: {
        // TODO: the Go implementation copies the RPC message here
        // figure out why they do that.
        this.handleCallMessage(m);
        break;
      }
      default: {
        trace(`Ignoring message ${Message_Which[m.which()]}`);
      }
    }
  }

  handleReturnMessage(m: RPCMessage) {
    const ret = m.getReturn();
    const id = ret.getAnswerId();
    const q = this.popQuestion(id);
    if (!q) {
      throw new Error(`received return for unknown question id=${id}`);
    }

    if (ret.getReleaseParamCaps()) {
      for (const s of q.paramCaps) {
        this.releaseExport(id, 1);
      }
    }

    let releaseResultCaps = true;
    switch (ret.which()) {
      case Return.RESULTS: {
        releaseResultCaps = false;
        const results = ret.getResults();
        // TODO: reply with unimplemented if we have a problem here
        this.populateMessageCapTable(results);

        const content = results.getContent();
        q.fulfill(content);
        break;
      }
      case Return.EXCEPTION: {
        const exc = ret.getException();
        let err: Error;
        if (q.method) {
          err = new MethodError(q.method, exc.getReason());
        } else {
          err = new RPCError(exc);
        }
        q.reject(err);
        break;
      }
      default: {
        trace(`Unhandled return which: ${Return_Which[ret.which()]}`);
      }
    }

    const fin = newFinishMessage(id, releaseResultCaps);
    this.sendMessage(fin);
  }

  handleCallMessage(m: RPCMessage) {
    const mcall = m.getCall();
    const mt = mcall.getTarget();
    if (
      mt.which() !== MessageTarget_Which.IMPORTED_CAP &&
      mt.which() !== MessageTarget_Which.PROMISED_ANSWER
    ) {
      const um = newUnimplementedMessage(m);
      this.sendMessage(um);
      return;
    }

    const mparams = mcall.getParams();
    try {
      this.populateMessageCapTable(mparams);
    } catch (e) {
      const um = newUnimplementedMessage(m);
      this.sendMessage(um);
      return;
    }

    const id = mcall.getQuestionId();
    const a = this.insertAnswer(id);
    if (!a) {
      // TODO: this should abort the whole conn
      // Question ID reused, error out
      throw new Error(`question ID reused!`);
    }

    const interfaceDef = Registry.lookup(mcall.getInterfaceId());
    if (!interfaceDef) {
      trace(
        `handleCallMessage: Unknown interface: ${mcall
          .getInterfaceId()
          .toHexString()}`
      );
      const um = newUnimplementedMessage(m);
      this.sendMessage(um);
      return;
    }

    const method = interfaceDef.methods[mcall.getMethodId()];
    if (!method) {
      trace(
        `handleCallMessage: Unknown method ${mcall.getMethodId()} on interface ${mcall
          .getInterfaceId()
          .toHexString()}`
      );
      const um = newUnimplementedMessage(m);
      this.sendMessage(um);
      return;
    }

    const paramContent = mparams.getContent();
    // tslint:disable-next-line:no-any
    const call: Call<any, any> = {
      method,
      params: Struct.getAs(method.ParamsClass, paramContent)
    };
    try {
      this.routeCallMessage(a, mt, call);
    } catch (e) {
      // tslint:disable-next-line:no-unsafe-any
      a.reject(e);
    }
  }

  routeCallMessage<P extends Struct, R extends Struct>(
    result: AnswerEntry<R>,
    mt: MessageTarget,
    cl: Call<P, R>
  ) {
    switch (mt.which()) {
      case MessageTarget_Which.IMPORTED_CAP: {
        const id = mt.getImportedCap();
        const e = this.findExport(id);
        if (!e) {
          throw new Error(`rpc: target not found`);
        }
        const answer = this.call(e.client, cl);
        joinAnswer(result, answer);
        break;
      }
      case MessageTarget_Which.PROMISED_ANSWER: {
        const mpromise = mt.getPromisedAnswer();
        const id = mpromise.getQuestionId();
        if (id === result.id) {
          // Grandfather paradox
          throw new Error(RPC_BAD_TARGET);
        }
        const pa = this.answers[id] as AnswerEntry<R>;
        if (!pa) {
          throw new Error(RPC_BAD_TARGET);
        }
        const mtrans = mpromise.getTransform();
        const transform = promisedAnswerOpsToTransform(mtrans);
        if (pa.done) {
          const { obj, err } = pa;
          const client = clientFromResolution(transform, obj, err);
          const answer = this.call(client, cl);
          joinAnswer(result, answer);
        } else {
          pa.queueCall(cl, transform, result);
        }

        break;
      }
      default: {
        throw new Error(INVARIANT_UNREACHABLE_CODE);
      }
    }
  }

  populateMessageCapTable(payload: Payload) {
    const msg = payload.segment.message;
    const ctab = payload.getCapTable();
    ctab.forEach(desc => {
      switch (desc.which()) {
        case CapDescriptor.NONE: {
          msg.addCap(null);
          break;
        }
        case CapDescriptor.SENDER_HOSTED: {
          const id = desc.getSenderHosted();
          const client = this.addImport(id);
          msg.addCap(client);
          break;
        }
        case CapDescriptor.SENDER_PROMISE: {
          // tslint:disable-next-line:max-line-length
          // Apparently, this is a hack, see https://sourcegraph.com/github.com/capnproto/go-capnproto2@e1ae1f982d9908a41db464f02861a850a0880a5a/-/blob/rpc/rpc.go#L549
          const id = desc.getSenderPromise();
          const client = this.addImport(id);
          msg.addCap(client);
          break;
        }
        case CapDescriptor.RECEIVER_HOSTED: {
          const id = desc.getReceiverHosted();
          const e = this.findExport(id);
          if (!e) {
            throw new Error(
              `rpc: capability table references unknown export ID ${id}`
            );
          }
          msg.addCap(e.rc.ref());
          break;
        }
        case CapDescriptor.RECEIVER_ANSWER: {
          const recvAns = desc.getReceiverAnswer();
          const id = recvAns.getQuestionId();
          const a = this.answers[id];
          if (!a) {
            throw new Error(
              `rpc: capability table references unknown answer ID ${id}`
            );
          }
          const recvTransform = recvAns.getTransform();
          const transform = promisedAnswerOpsToTransform(recvTransform);
          msg.addCap(answerPipelineClient(a, transform));
          break;
        }
        default:
          throw new Error(
            `unhandled cap descriptor which: ${
              CapDescriptor_Which[desc.which()]
            }`
          );
      }
    });
  }

  addImport(id: number): Client {
    const importEntry = this.imports[id];
    if (importEntry) {
      importEntry.refs++;
      return importEntry.rc.ref();
    }
    const client = new ImportClient(this, id);
    const [rc, ref] = RefCount.new(client, this.finalize);
    this.imports[id] = {
      rc,
      refs: 1
    };
    return ref;
  }

  findExport(id: number): Export | null {
    if (id > this.exports.length) {
      return null;
    }
    return this.exports[id];
  }

  addExport(client: Client): number {
    for (let i = 0; i < this.exports.length; i++) {
      const e = this.exports[i];
      if (e && isSameClient(e.rc._client, client)) {
        e.wireRefs++;
        return i;
      }
    }

    const id = this.exportID.next();
    const [rc, ref] = RefCount.new(client, this.finalize);
    const _export: Export = {
      client: ref,
      id,
      rc,
      wireRefs: 1
    };
    if (id === this.exports.length) {
      this.exports.push(_export);
    } else {
      this.exports[id] = _export;
    }
    return id;
  }

  releaseExport(id: number, refs: number) {
    const e = this.findExport(id);
    if (!e) {
      return;
    }
    e.wireRefs -= refs;
    if (e.wireRefs > 0) {
      return;
    }
    if (e.wireRefs < 0) {
      this.error(`warning: export ${id} has negative refcount (${e.wireRefs})`);
    }
    e.client.close();
    this.exports[id] = null;
    this.exportID.remove(id);
  }

  error(s: string) {
    // TODO: relint
    // tslint:disable-next-line
    console.error(s);
  }

  newQuestion<CallParams extends Struct, CallResults extends Struct>(
    method?: Method<CallParams, CallResults>
  ): Question<CallParams, CallResults> {
    const id = this.questionID.next();
    const q = new Question(this, id, method);
    if (id === this.questions.length) {
      this.questions.push(q);
    } else {
      this.questions[id] = q;
    }
    return q;
  }

  findQuestion<P extends Struct, R extends Struct>(
    id: number
  ): Question<P, R> | null {
    if (id > this.questions.length) {
      return null;
    }
    return this.questions[id];
  }

  popQuestion<P extends Struct, R extends Struct>(
    id: number
  ): Question<P, R> | null {
    const q = this.findQuestion<P, R>(id);
    if (!q) {
      return q;
    }
    this.questions[id] = null;
    this.questionID.remove(id);
    return q;
  }

  // TODO: cancel context?
  // tslint:disable-next-line:no-any
  insertAnswer(id: number): AnswerEntry<any> | null {
    if (this.answers[id]) {
      return null;
    }
    const a = new AnswerEntry(this, id);
    this.answers[id] = a;
    return a;
  }

  // tslint:disable-next-line:no-any
  popAnswer(id: number): AnswerEntry<any> | null {
    const a = this.answers[id];
    delete this.answers[id];
    return a;
  }

  shutdown(err: Error) {
    // FIXME: unstub
    // tslint:disable-next-line:no-console
    console.error(`Shutdown (stub): `, err.stack);
    this.transport.close();
  }

  call<P extends Struct, R extends Struct>(
    _client: Client,
    _call: Call<P, R>
  ): Answer<R> {
    throw new Error(`Conn.call: stub!`);
  }

  fillParams<P extends Struct, R extends Struct>(
    payload: Payload,
    cl: Call<P, R>
  ) {
    const params = placeParams(cl, payload.getContent());
    payload.setContent(params);
    this.makeCapTable(payload.segment, length => payload.initCapTable(length));
  }

  makeCapTable(
    s: Segment,
    init: (length: number) => List<CapDescriptor>
  ): void {
    const msgtab = s.message._capnp.capTable;
    if (!msgtab) {
      return;
    }
    const t = init(msgtab.length);
    for (let i = 0; i < msgtab.length; i++) {
      const client = msgtab[i];
      const desc = t.get(i);
      if (!client) {
        desc.setNone();
        continue;
      }
      this.descriptorForClient(desc, client);
    }
  }

  // descriptorForClient fills desc for client, adding it to the export
  // table if necessary.  The caller must be holding onto c.mu.
  descriptorForClient(desc: CapDescriptor, _client: Client): void {
    {
      dig: for (let client = _client; ; ) {
        // tslint:disable-next-line:max-line-length
        // cf. https://sourcegraph.com/github.com/capnproto/go-capnproto2@e1ae1f982d9908a41db464f02861a850a0880a5a/-/blob/rpc/introspect.go#L113
        // TODO: fulfiller.EmbargoClient
        // TODO: embargoClient
        // TODO: queueClient
        // TODO: localAnswerClient
        if (client instanceof ImportClient) {
          if (client.conn !== this) {
            break dig;
          }
          desc.setReceiverHosted(client.id);
          return;
        } else if (client instanceof Ref) {
          client = client.client();
        } else if (client instanceof PipelineClient) {
          const p = client.pipeline;
          const ans = p.answer;
          const transform = p.transform();
          // TODO: fulfiller
          if (ans instanceof FixedAnswer) {
            let s: Struct | undefined;
            let err: Error | undefined;
            try {
              // TODO: relint
              // tslint:disable-next-line:no-unsafe-any
              s = ans.structSync();
            } catch (e) {
              // tslint:disable-next-line:no-unsafe-any
              err = e;
            }
            client = clientFromResolution(transform, s, err);
          } else if (ans instanceof Question) {
            if (ans.state !== QuestionState.IN_PROGRESS) {
              // tslint:disable-next-line:no-unsafe-any
              client = clientFromResolution(transform, ans.obj, ans.err);
              continue;
            }
            if (ans.conn !== this) {
              break dig;
            }
            const a = desc.initReceiverAnswer();
            a.setQuestionId(ans.id);
            transformToPromisedAnswer(a, p.transform());
            return;
          } else {
            break dig;
          }
        } else {
          break dig;
        }
      }
    }

    const id = this.addExport(_client);
    desc.setSenderHosted(id);
  }

  sendMessage(msg: RPCMessage) {
    this.transport.sendMessage(msg);
  }

  private async work() {
    for (;;) {
      const m = await this.transport.recvMessage();
      this.handleMessage(m);
    }
  }
}

interface Export {
  id: number;
  rc: RefCount;
  client: Client;
  wireRefs: number;
}

export interface ImportEntry {
  rc: RefCount;
  refs: number;
}

export function answerPipelineClient<T extends Struct>(
  a: AnswerEntry<T>,
  transform: PipelineOp[]
): Client {
  return new LocalAnswerClient(a, transform);
}
