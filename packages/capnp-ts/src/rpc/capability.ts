import { Message as capnpMessage } from "../serialization/message";
import { Message } from "../std/rpc.capnp";

// A CapabilityID is an index into a message's capability table.
export type CapabilityID = number;

export function newMessage(): Message {
  return new capnpMessage().initRoot(Message);
}

export function newFinishMessage(
  questionID: number,
  release: boolean
): Message {
  const m = newMessage();
  const f = m.initFinish();
  f.setQuestionId(questionID);
  f.setReleaseResultCaps(release);
  return m;
}
