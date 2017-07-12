/**
 * @author jdiaz5513
 */

import initTrace from 'debug';

import {DEFAULT_BUFFER_SIZE} from '../../constants';
import {SEG_ID_OUT_OF_BOUNDS} from '../../errors';
import {format, padToWord} from '../../util';
import {Segment} from '../segment';
import {Arena} from './arena';
import {ArenaAllocationResult} from './arena-allocation-result';

const trace = initTrace('capnp:arena:multi');
trace('load');

export class MultiSegmentArena extends Arena {

  private readonly _buffers: ArrayBuffer[];

  constructor(buffers: ArrayBuffer[] = []) {

    super();

    this._buffers = buffers;

  }

  allocate(minSize: number, _segments: Segment[]): ArenaAllocationResult {

    const b = new ArrayBuffer(padToWord(Math.max(minSize, DEFAULT_BUFFER_SIZE)));
    this._buffers.push(b);

    return new ArenaAllocationResult(this._buffers.length - 1, b);

  }

  getBuffer(id: number): ArrayBuffer {

    if (id < 0 || id >= this._buffers.length) throw new Error(format(SEG_ID_OUT_OF_BOUNDS, id));

    return this._buffers[id];

  }

  getNumSegments(): number {

    return this._buffers.length;

  }

  toString() {

    return format('MultiSegmentArena_segments:%d', this.getNumSegments());

  }

}
