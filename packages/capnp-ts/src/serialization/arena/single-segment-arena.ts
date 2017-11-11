/**
 * @author jdiaz5513
 */

import initTrace from 'debug';
import { DEFAULT_BUFFER_SIZE, MIN_SINGLE_SEGMENT_GROWTH } from '../../constants';
import { SEG_GET_NON_ZERO_SINGLE, SEG_NOT_WORD_ALIGNED } from '../../errors';
import { format, padToWord } from '../../util';
import { Segment } from '../segment';
import { ArenaAllocationResult } from './arena-allocation-result';
import { ArenaKind } from './arena-kind';

const trace = initTrace('capnp:arena:single');
trace('load');

export class SingleSegmentArena {

  static readonly allocate = allocate;
  static readonly getBuffer = getBuffer;
  static readonly getNumSegments = getNumSegments;

  buffer: ArrayBuffer;
  readonly kind = ArenaKind.SINGLE_SEGMENT;

  constructor(buffer = new ArrayBuffer(DEFAULT_BUFFER_SIZE)) {

    if ((buffer.byteLength & 7) !== 0) throw new Error(format(SEG_NOT_WORD_ALIGNED, buffer.byteLength));

    this.buffer = buffer;

    trace('new', this);

  }

  toString() { return format('SingleSegmentArena_len:%x', this.buffer.byteLength); }

}

function allocate(minSize: number, segments: Segment[], s: SingleSegmentArena): ArenaAllocationResult {

  trace('Allocating %x bytes for segment 0 in %s.', minSize, s);

  const srcBuffer = segments.length > 0 ? segments[0].buffer : s.buffer;

  if (minSize < MIN_SINGLE_SEGMENT_GROWTH) {

    minSize = MIN_SINGLE_SEGMENT_GROWTH;

  } else {

    minSize = padToWord(minSize);

  }

  s.buffer = new ArrayBuffer(srcBuffer.byteLength + minSize);

  // PERF: Assume that the source and destination buffers are word-aligned and use Float64Array to copy them one word
  // at a time.
  new Float64Array(s.buffer).set(new Float64Array(srcBuffer));

  return new ArenaAllocationResult(0, s.buffer);

}

function getBuffer(id: number, s: SingleSegmentArena): ArrayBuffer {

  if (id !== 0) throw new Error(format(SEG_GET_NON_ZERO_SINGLE, id));

  return s.buffer;

}

function getNumSegments(): number {

  return 1;

}
