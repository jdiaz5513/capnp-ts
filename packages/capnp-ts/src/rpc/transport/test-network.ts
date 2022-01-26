import { MessagePort, MessageChannel } from "worker_threads";
import { Deferred, Conn } from "..";
import { MessageChannelTransport } from "./message-channel-transport";

export class TestNetwork {
  static acceptQueue = new Array<Deferred<Conn>>();
  static connections: Record<number, Conn> = {};
  static connectQueue = new Array<MessagePort>();
  static onError?: (err: Error | undefined) => void;

  static connect(id = 0): Conn {
    if (TestNetwork.connections[id] !== undefined) return TestNetwork.connections[id];
    const ch = new MessageChannel();
    const conn = new Conn(new MessageChannelTransport(ch.port1));
    const accept = TestNetwork.acceptQueue.pop();
    TestNetwork.connections[id] = conn;

    if (accept !== undefined) {
      accept.resolve(new Conn(new MessageChannelTransport(ch.port2)));
    } else {
      TestNetwork.connectQueue.push(ch.port2);
    }

    return conn;
  }

  static accept(): Promise<Conn> {
    const port2 = TestNetwork.connectQueue.pop();
    if (port2 !== undefined) {
      return Promise.resolve(new Conn(new MessageChannelTransport(port2)));
    }
    const deferred = new Deferred<Conn>();
    TestNetwork.acceptQueue.push(deferred);
    return deferred.promise;
  }

  static shutdown(): void {
    let i = TestNetwork.acceptQueue.length;
    while (--i >= 0) {
      TestNetwork.acceptQueue[i].reject();
    }

    i = TestNetwork.connectQueue.length;
    while (--i >= 0) {
      TestNetwork.connectQueue[i].close();
    }

    for (const id in TestNetwork.connections) {
      TestNetwork.connections[id].shutdown();
    }

    TestNetwork.acceptQueue.length = 0;
    TestNetwork.connectQueue.length = 0;
    TestNetwork.connections = {};
  }
}
