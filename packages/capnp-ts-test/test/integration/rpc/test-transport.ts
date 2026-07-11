/**
 * In-memory transport pair for RPC specs: deterministic, inspectable.
 *
 * Messages are delivered asynchronously (microtask) to mimic a network turn, and every
 * send/receive is recorded in `log` so specs can assert on wire behavior (e.g. the
 * pipelining property: N calls sent before the first Return arrives) without touching
 * connection internals.
 */

import * as capnp from "capnp-ts";
import { Message as RPCMessage, Message_Which } from "capnp-ts/src/std/rpc.capnp.js";

/** Decode the union tag of an RPC message (transport frames are unpacked + framed). */
export function decodeMessageType(data: Uint8Array): Message_Which {
  return new capnp.Message(data, false).getRoot(RPCMessage).which();
}

export class TestTransport implements capnp.Transport {
  static pair(): [TestTransport, TestTransport] {
    const a = new TestTransport();
    const b = new TestTransport();
    a.peer = b;
    b.peer = a;
    return [a, b];
  }

  private closeCb?: (err?: Error) => void;
  private closed = false;
  readonly log: TransportLogEntry[] = [];
  private messageCb?: (data: Uint8Array) => void;
  private peer?: TestTransport;
  private pending: Uint8Array[] = [];

  close(): void {
    if (this.closed) return;
    this.closed = true;
    queueMicrotask(() => this.peer?.remoteClosed());
  }

  private deliver(data: Uint8Array): void {
    if (this.closed) return;
    this.log.push({ dir: "recv", data });
    if (this.messageCb) {
      this.messageCb(data);
    } else {
      this.pending.push(data);
    }
  }

  /** Log index of the first received message, or -1. */
  firstRecvIndex(): number {
    return this.log.findIndex((e) => e.dir === "recv");
  }

  onClose(cb: (err?: Error) => void): void {
    this.closeCb = cb;
  }

  onMessage(cb: (data: Uint8Array) => void): void {
    this.messageCb = cb;
    const queued = this.pending;
    this.pending = [];
    queued.forEach((data) => cb(data));
  }

  private remoteClosed(): void {
    if (this.closed) return;
    this.closed = true;
    this.closeCb?.();
  }

  send(data: Uint8Array): void {
    if (this.closed) throw new Error("TestTransport: send after close");
    this.log.push({ dir: "send", data });
    queueMicrotask(() => this.peer?.deliver(data));
  }

  /** The RPC message types this side has sent, in order. */
  sentTypes(): Message_Which[] {
    return this.log.filter((e) => e.dir === "send").map((e) => decodeMessageType(e.data));
  }
}

export interface TransportLogEntry {
  data: Uint8Array;
  dir: "send" | "recv";
}
