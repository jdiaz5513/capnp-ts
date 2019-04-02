import { Message } from "../std/rpc.capnp";

export interface Transport {
  sendMessage(msg: Message): void;
  recvMessage(): Promise<Message>;
  close(): void;
}
