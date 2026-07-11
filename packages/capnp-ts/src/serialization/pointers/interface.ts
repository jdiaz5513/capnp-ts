/**
 * @author jdiaz5513
 */

import { MAX_DEPTH } from "../../constants";
import { format } from "../../util";
import { Segment } from "../segment";
import { getCapabilityId, getTargetPointerType, Pointer } from "./pointer";
import { PointerType } from "./pointer-type";
import type { Client } from "../../rpc/client";

/**
 * A capability (interface) pointer: an index into the containing message's cap table.
 */

export class Interface extends Pointer {
  static readonly _capnp = {
    displayName: "Interface" as string,
  };
  static readonly fromPointer = fromPointer;
  static readonly getCapId = getCapId;
  static readonly getClient = getClient;
  static readonly isInterface = isInterface;

  constructor(segment: Segment, byteOffset: number, depthLimit = MAX_DEPTH) {
    super(segment, byteOffset, depthLimit);
  }

  getCapId(): number {
    return getCapId(this);
  }

  getClient(): Client | null {
    return getClient(this);
  }

  toString(): string {
    return format("Interface_%d@%a,cap:%d", this.segment.id, this.byteOffset, this.getCapId());
  }
}

export function fromPointer(p: Pointer): Interface | null {
  return isInterface(p) ? new Interface(p.segment, p.byteOffset, p._capnp.depthLimit) : null;
}

/** The capability ID of this pointer, or -1 if it is not a capability pointer. */

export function getCapId(i: Pointer): number {
  if (i.segment.getUint32(i.byteOffset) !== PointerType.OTHER) return -1;

  return getCapabilityId(i);
}

/** Look up this capability pointer's client in the message's cap table. */

export function getClient(i: Pointer): Client | null {
  const capId = getCapId(i);

  if (capId < 0) return null;

  const { capTable } = i.segment.message._capnp;

  if (capTable === undefined || capId >= capTable.length) return null;

  return capTable[capId];
}

export function isInterface(p: Pointer): boolean {
  return getTargetPointerType(p) === PointerType.OTHER;
}
