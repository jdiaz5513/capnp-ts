import { RPCMessage } from "./rpc-message";
import { Message } from "../serialization/message";
import {
  Return,
  Exception,
  Disembargo,
  Disembargo_Context_Which
} from "../std/rpc.capnp";
import { toException } from "./rpc-error";
import { INVARIANT_UNREACHABLE_CODE } from "../errors";

// A CapabilityID is an index into a message's capability table.
export type CapabilityID = number;

export function newMessage(): RPCMessage {
  return new Message().initRoot(RPCMessage);
}

export function newFinishMessage(
  questionID: number,
  release: boolean
): RPCMessage {
  const m = newMessage();
  const f = m.initFinish();
  f.setQuestionId(questionID);
  f.setReleaseResultCaps(release);
  return m;
}

export function newUnimplementedMessage(m: RPCMessage): RPCMessage {
  const n = newMessage();
  n.setUnimplemented(m);
  return n;
}

export function newReturnMessage(id: number): RPCMessage {
  const m = newMessage();
  const ret = m.initReturn();
  ret.setAnswerId(id);
  return m;
}

export function setReturnException(ret: Return, err: Error): Exception {
  const exc = ret.initException();
  toException(exc, err);
  return exc;
}

export function newDisembargoMessage(
  which: Disembargo_Context_Which,
  id: number
): RPCMessage {
  const m = newMessage();
  const dis = m.initDisembargo();
  const ctx = dis.initContext();
  switch (which) {
    case Disembargo_Context_Which.SENDER_LOOPBACK: {
      ctx.setSenderLoopback(id);
      break;
    }
    case Disembargo_Context_Which.RECEIVER_LOOPBACK: {
      ctx.setReceiverLoopback(id);
      break;
    }
    default:
      throw new Error(INVARIANT_UNREACHABLE_CODE);
  }
  return m;
}
