import { RPCMessage } from "./rpc-message";

export interface Transport {
  sendMessage(msg: RPCMessage): void;
  recvMessage(): Promise<RPCMessage>;
  close(): void;
}
