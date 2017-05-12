/**
 * @author jdiaz5513
 */

import initTrace from 'debug';

import {NOT_IMPLEMENTED} from '../../errors';
import {format} from '../../util';
import {Segment} from '../segment';
import {Arena} from './arena';
import {ArenaAllocationResult} from './arena-allocation-result';

const trace = initTrace('capnp:arean:multi');
trace('load');

export class MultiSegmentArena extends Arena {

  private readonly _buffers: ArrayBuffer[];

  constructor(buffers: ArrayBuffer[] = []) {

    super();

    this._buffers = buffers;

  }

  allocate(_minSize: number, _segments: Segment[]): ArenaAllocationResult {

    throw new Error(format(NOT_IMPLEMENTED, 'MultiSegmentArena.prototype.allocate'));

  }

  getBuffer(_id: number): ArrayBuffer {

    throw new Error(format(NOT_IMPLEMENTED, 'MultiSegmentArena.prototype.getBuffer'));

  }

  getNumSegments(): number {

    throw new Error(format(NOT_IMPLEMENTED, 'MultiSegmentArena.prototype.getNumSegments'));

  }

  toString() {

    return format('MultiSegmentArena_segments:%d');

  }

}
