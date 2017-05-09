/**
 * @author jdiaz5513
 */

import initTrace from 'debug';

import {NOT_IMPLEMENTED} from '../../errors';
import {format} from '../../util';
import {Segment} from '../segment';
import {Arena} from './arena';

const trace = initTrace('capnp:arean:multi');
trace('load');

export class MultiSegmentArena extends Arena {

  allocate(_minSize: number, _segments: {[id: number]: Segment}): [number, ArrayBuffer] {

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
