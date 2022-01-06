/**
 * @author jdiaz5513
 * @author fasterthanlime
 */

import { MAX_DEPTH } from "../../constants";
import { Segment } from "../segment";
import { Pointer, getTargetPointerType } from "./pointer";
import { CapabilityID } from "../../rpc/capability";
import { Client } from "../../rpc";
import { PointerType } from "./pointer-type";
import { format } from "../../util";

export class Interface extends Pointer {
  static readonly _capnp = {
    displayName: "Interface" as string,
  };
  static readonly getCapID = getCapID;
  static readonly getAsInterface = getAsInterface;
  static readonly isInterface = isInterface;
  static readonly getClient = getClient;

  constructor(segment: Segment, byteOffset: number, depthLimit = MAX_DEPTH) {
    super(segment, byteOffset, depthLimit);
  }

  static fromPointer(p: Pointer): Interface | null {
    return getAsInterface(p);
  }

  getCapId(): CapabilityID {
    return getCapID(this);
  }

  getClient(): Client | null {
    return getClient(this);
  }

  toString(): string {
    return format(
      "Interface_%d@%a,%d,limit:%x",
      this.segment.id,
      this.byteOffset,
      this.getCapId(),
      this._capnp.depthLimit
    );
  }
}

export function getAsInterface(p: Pointer): Interface | null {
  if (getTargetPointerType(p) === PointerType.OTHER) {
    return new Interface(p.segment, p.byteOffset, p._capnp.depthLimit);
  }
  return null;
}

export function isInterface(p: Pointer): boolean {
  return getTargetPointerType(p) === PointerType.OTHER;
}

export function getCapID(i: Interface): CapabilityID {
  if (i.segment.getUint32(i.byteOffset) !== PointerType.OTHER) {
    return -1;
  }
  return i.segment.getUint32(i.byteOffset + 4);
}

export function getClient(i: Interface): Client | null {
  const capID = getCapID(i);
  const { capTable } = i.segment.message._capnp;
  if (!capTable) {
    return null;
  }
  return capTable[capID];
}
