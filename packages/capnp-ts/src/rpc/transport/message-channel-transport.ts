import { MessagePort } from "worker_threads";
import { RPCMessage } from "..";
import { Message } from "../..";
import { DeferredTransport } from "./deferred-transport";

export class MessageChannelTransport extends DeferredTransport {
  constructor(public port: MessagePort) {
    super();
    this.port.on("message", this.resolve);
    this.port.on("messageerror", this.reject);
    this.port.on("close", this.close);
  }

  close = (): void => {
    this.port.off("message", this.resolve);
    this.port.off("messageerror", this.reject);
    this.port.off("close", this.close);
    this.port.close();
    super.close();
  };

  sendMessage(msg: RPCMessage): void {
    const m = new Message();
    m.setRoot(msg);
    const buf = m.toArrayBuffer();
    this.port.postMessage(buf, [buf]);
  }
}
