import initTrace from 'debug';

import {
  PTR_ADOPT_WRONG_MESSAGE,
  PTR_ALREADY_ADOPTED,
  PTR_INVALID_POINTER_TYPE,
} from '../../errors';
import { format } from '../../util';
import { ListElementSize } from '../list-element-size';
import { ObjectSize } from '../object-size';
import { Segment } from '../segment';
import { Pointer } from './pointer';
import { PointerType } from './pointer-type';

const trace = initTrace('capnp:orphan');
trace('load');

export interface _Orphan {
  capId: number;
  elementSize: ListElementSize;
  length: number;
  size: ObjectSize;
  type: PointerType;
}

// Technically speaking this class doesn't need to be generic, but the extra type checking enforced by this helps to
// make sure you don't accidentally adopt a pointer of the wrong type.

/**
 * An orphaned pointer. This object itself is technically a pointer to the original pointer's content, which was left
 * untouched in its original message. The original pointer data is encoded as attributes on the Orphan object, ready to
 * be reconstructed once another pointer is ready to adopt it.
 *
 * @export
 * @class Orphan
 * @extends {Pointer}
 * @template T
 */

export class Orphan<T extends Pointer> {

  /** If this member is not present then the orphan has already been adopted, or something went very wrong. */
  _capnp?: _Orphan;

  byteOffset: number;
  segment: Segment;

  constructor(src: T) {

    const c = src._getContent();

    this.segment = c.segment;
    this.byteOffset = c.byteOffset;

    this._capnp = {} as _Orphan;

    // Read vital info from the src pointer so we can reconstruct it during adoption.

    this._capnp.type = src._getTargetPointerType();

    switch (this._capnp.type) {

      case PointerType.STRUCT:

        this._capnp.size = src._getTargetStructSize();

        break;

      case PointerType.LIST:

        this._capnp.length = src._getTargetListLength();
        this._capnp.elementSize = src._getTargetListElementSize();

        if (this._capnp.elementSize === ListElementSize.COMPOSITE) this._capnp.size = src._getTargetCompositeListSize();

        break;

      case PointerType.OTHER:

        this._capnp.capId = src._getCapabilityId();

        break;

      default:

        // COVERAGE: Unreachable code.
        /* istanbul ignore next */
        throw new Error(PTR_INVALID_POINTER_TYPE);

    }

    // Zero out the source pointer (but not the contents!).

    src._erasePointer();

  }

  /**
   * Adopt (move) this orphan into the target pointer location. This will allocate far pointers in `dst` as needed.
   *
   * @param {T} dst The destination pointer.
   * @returns {void}
   */

  _moveTo(dst: T): void {

    if (this._capnp === undefined) throw new Error(format(PTR_ALREADY_ADOPTED, this));

    // TODO: Implement copy semantics when this happens.
    if (this.segment.message !== dst.segment.message) throw new Error(format(PTR_ADOPT_WRONG_MESSAGE, this, dst));

    // Recursively wipe out the destination pointer first.

    dst._erase();

    const res = dst._initPointer(this.segment, this.byteOffset);

    switch (this._capnp.type) {

      case PointerType.STRUCT:

        res.pointer._setStructPointer(res.offsetWords, this._capnp.size);

        break;

      case PointerType.LIST:

        let offsetWords = res.offsetWords;

        if (this._capnp.elementSize === ListElementSize.COMPOSITE) offsetWords--;    // The tag word gets skipped.

        res.pointer._setListPointer(offsetWords, this._capnp.elementSize, this._capnp.length, this._capnp.size);

        break;

      case PointerType.OTHER:

        res.pointer._setInterfacePointer(this._capnp.capId);

        break;

      /* istanbul ignore next */
      default:

        throw new Error(PTR_INVALID_POINTER_TYPE);

    }

    this._capnp = undefined;

  }

  dispose(): void {

    // FIXME: Should this throw?
    if (this._capnp === undefined) {

      trace('not disposing an already disposed orphan', this);

      return;

    }

    switch (this._capnp.type) {

      case PointerType.STRUCT:

        this.segment.fillZeroWords(this.byteOffset, this._capnp.size.getWordLength());

        break;

      case PointerType.LIST:

        const byteLength = Pointer._getListByteLength(this._capnp.elementSize, this._capnp.length, this._capnp.size);
        this.segment.fillZeroWords(this.byteOffset, byteLength);

        break;

      default:

        // Other pointer types don't actually have any content.

        break;

    }

    this._capnp = undefined;

  }

  toString(): string {

    return format('Orphan_%d@%a,type:%s', this.segment.id, this.byteOffset, this._capnp && this._capnp.type);

  }

}
