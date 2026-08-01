/**
 * RPC message transport abstraction.
 *
 * A transport moves whole Cap'n Proto RPC messages (unpacked, stream-framed) between
 * two vats. WebSocket is the reference implementation: ws frames delimit messages, so
 * no additional length-prefix framing is needed.
 */

export function isWebSocketLike(value: unknown): value is WebSocketLike {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as WebSocketLike).send === "function" &&
    typeof (value as WebSocketLike).addEventListener === "function"
  );
}

export interface Transport {
  close(): void;

  /** Register the (single) close/error callback. */
  onClose(cb: (err?: Error) => void): void;

  /** Register the (single) incoming-message callback. */
  onMessage(cb: (data: Uint8Array) => void): void;

  /** Send one complete RPC message. */
  send(data: Uint8Array): void;
}

/**
 * The subset of the WHATWG WebSocket surface Conn needs; satisfied by both the browser
 * WebSocket and the `ws` package's server-side sockets.
 */

export interface WebSocketLike {
  addEventListener(type: "message", listener: (event: { data: unknown }) => void): void;
  addEventListener(type: "close", listener: () => void): void;
  addEventListener(type: "error", listener: (event: unknown) => void): void;
  addEventListener(type: "open", listener: () => void): void;
  binaryType: string;
  close(): void;
  readyState: number;
  send(data: ArrayBufferLike | ArrayBufferView): void;
}

export class WebSocketTransport implements Transport {
  /** Messages sent before the socket opened; flushed on open. */
  private pending?: Uint8Array[];
  private readonly ws: WebSocketLike;

  constructor(ws: WebSocketLike) {
    this.ws = ws;
    this.ws.binaryType = "arraybuffer";

    // CONNECTING; browser sockets throw on send before open, so buffer until then.
    if (ws.readyState === 0) {
      this.pending = [];
      ws.addEventListener("open", () => {
        const queued = this.pending ?? [];

        this.pending = undefined;
        queued.forEach((data) => this.ws.send(data));
      });
    }
  }

  close(): void {
    this.ws.close();
  }

  onClose(cb: (err?: Error) => void): void {
    this.ws.addEventListener("close", () => {
      cb();
    });
    this.ws.addEventListener("error", (event) => {
      cb(event instanceof Error ? event : new Error("websocket error"));
    });
  }

  onMessage(cb: (data: Uint8Array) => void): void {
    this.ws.addEventListener("message", (event) => {
      const data = event.data;

      if (data instanceof ArrayBuffer) {
        cb(new Uint8Array(data));
      } else if (ArrayBuffer.isView(data)) {
        cb(new Uint8Array(data.buffer, data.byteOffset, data.byteLength));
      }
    });
  }

  send(data: Uint8Array): void {
    if (this.pending !== undefined) {
      this.pending.push(data);
    } else {
      this.ws.send(data);
    }
  }
}
