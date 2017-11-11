/**
 * @author jdiaz5513
 */

import initTrace from 'debug';

import { DEFAULT_BUFFER_SIZE, MIN_SINGLE_SEGMENT_GROWTH } from '../../constants';
import { SEG_GET_NON_ZERO_SINGLE, SEG_NOT_WORD_ALIGNED } from '../../errors';
import { format, padToWord } from '../../util';
import { Segment } from '../segment';
import { Arena } from './arena';
import { ArenaAllocationResult } from './arena-allocation-result';

const trace = initTrace('capnp:arena:single');
trace('load');

export class SingleSegmentArena implements Arena {

  private _buffer: ArrayBuffer;

  constructor(buffer = new ArrayBuffer(DEFAULT_BUFFER_SIZE)) {

    if ((buffer.byteLength & 7) !== 0) throw new Error(format(SEG_NOT_WORD_ALIGNED, buffer.byteLength));

    this._buffer = buffer;

    trace('Instantiated arena %s.', this);

  }

  allocate(minSize: number, segments: Segment[]): ArenaAllocationResult {

    trace('Allocating %x bytes for segment 0 in %s.', minSize, this);

    const srcBuffer = segments.length > 0 ? segments[0].buffer : this._buffer;

    if (minSize < MIN_SINGLE_SEGMENT_GROWTH) {

      minSize = MIN_SINGLE_SEGMENT_GROWTH;

    } else {

      minSize = padToWord(minSize);

    }

    this._buffer = new ArrayBuffer(srcBuffer.byteLength + minSize);

    // PERF: Assume that the source and destination buffers are word-aligned and use Float64Array to copy them one word
    // at a time.
    new Float64Array(this._buffer).set(new Float64Array(srcBuffer));

    return new ArenaAllocationResult(0, this._buffer);

  }

  getBuffer(id: number): ArrayBuffer {

    if (id !== 0) throw new Error(format(SEG_GET_NON_ZERO_SINGLE, id));

    return this._buffer;

  }

  getNumSegments(): number {

    return 1;

  }

  toString() {

    return format('SingleSegmentArena_len:%x', this._buffer.byteLength);

  }

}
