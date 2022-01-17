import { RPCMessage } from "../rpc-message";

export * from "./deferred-transport";
export * from "./message-channel-transport";
export * from "./test-network";

export interface Transport {
  sendMessage(msg: RPCMessage): void;
  recvMessage(): Promise<RPCMessage>;
  close(): void;
}
