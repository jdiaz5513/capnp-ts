/**
 * @author jdiaz5513
 */

import initTrace from "debug";

const trace = initTrace("capnp:serialization:arena:arena-allocation-result");
trace("load");

export class ArenaAllocationResult {
  /**
   * The newly allocated buffer. This buffer might be a copy of an existing segment's buffer with free space appended.
   *
   * @type {ArrayBuffer}
   */

  readonly buffer: ArrayBuffer;

  /**
   * The id of the newly-allocated segment.
   *
   * @type {number}
   */

  readonly id: number;

  constructor(id: number, buffer: ArrayBuffer) {
    this.id = id;
    this.buffer = buffer;

    trace("new", this);
  }
}
