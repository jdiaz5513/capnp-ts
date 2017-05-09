/**
 * @author jdiaz5513
 */

import initTrace from 'debug';

import {Segment} from '../segment';

const trace = initTrace('capnp:arena');
trace('load');

export abstract class Arena {

  abstract allocate(minSize: number, segments: {[id: number]: Segment}): [number, ArrayBuffer];

  abstract getBuffer(id: number): ArrayBuffer;

  abstract getNumSegments(): number;

}
