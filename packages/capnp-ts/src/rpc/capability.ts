import { RPCMessage } from "./rpc-message";
import { Message } from "../serialization/message";

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
