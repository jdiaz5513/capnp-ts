/**
 * @author jdiaz5513
 */

import initTrace from 'debug';

import {padToWord} from '../util';

const trace = initTrace('capnp:object-size');
trace('load');

/**
 * A simple object that describes the size of a struct.
 *
 * @export
 * @class ObjectSize
 */

export class ObjectSize {

  /** The number of bytes required for the data section. */

  readonly dataByteLength: number;

  /** The number of pointers in the object. */

  readonly pointerLength: number;

  constructor(dataByteLength: number, pointerCount: number) {

    this.dataByteLength = dataByteLength;
    this.pointerLength = pointerCount;

  }

  getByteLength(): number {

    return this.dataByteLength + this.pointerLength * 8;

  }

  getDataWordLength(): number {

    return this.dataByteLength / 8;

  }

  getWordLength(): number {

    return this.dataByteLength / 8 + this.pointerLength;

  }

  padToWord(): ObjectSize {

    return new ObjectSize(padToWord(this.dataByteLength), this.pointerLength);

  }

}
