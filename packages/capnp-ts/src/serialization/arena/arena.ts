/**
 * @author jdiaz5513
 */

import initTrace from 'debug';

import { Segment } from '../segment';
import { ArenaAllocationResult } from './arena-allocation-result';

const trace = initTrace('capnp:arena');
trace('load');

export abstract class Arena {

  /**
   * Allocate at least `minSize` bytes of new memory. The arena implementation may choose to either create a new buffer
   * or resize an existing one from the provided segments array.
   *
   * If an existing segment ID is returned as a result of calling this function, the callee should update that segment
   * with the new buffer.
   *
   * @abstract
   * @param {number} minSize The minimum number of bytes requested. The arena implementation is free to allocate more
   * depending on the allocation strategy.
   * @param {Segment[]} segments The existing array of segments from the message requesting a buffer.
   * @returns {number} The ID of the newly allocated segment; possibly the ID of an existing segment.
   */

  abstract allocate(minSize: number, segments: Segment[]): ArenaAllocationResult;

  /**
   * Get the buffer for a segment with the given ID.
   *
   * @abstract
   * @param {number} id The segment ID.
   * @returns {ArrayBuffer} The underlying buffer for the segment.
   */

  abstract getBuffer(id: number): ArrayBuffer;

  /**
   * Get the total number of segment buffers that have been allocated in this arena.
   *
   * @abstract
   * @returns {number} The total number of segments.
   */

  abstract getNumSegments(): number;

}
