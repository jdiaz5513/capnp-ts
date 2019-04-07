/**
 * @author jdiaz5513
 * @author fasterthanlime
 */

import { MAX_DEPTH } from "../../constants";
import { Segment } from "../segment";
import { _Pointer, Pointer, getTargetPointerType, dump } from "./pointer";
import { CapabilityID } from "../../rpc/capability";
import { Client } from "../../rpc";
import { PointerType } from "./pointer-type";
import { format } from "../../util";

export class Interface extends Pointer {
  static readonly _capnp = {
    displayName: "Interface" as string
  };
  static readonly getCapID = getCapID;
  static readonly getAsInterface = getAsInterface;
  static readonly getClient = getClient;

  constructor(segment: Segment, byteOffset: number, depthLimit = MAX_DEPTH) {
    super(segment, byteOffset, depthLimit);
  }

  static fromPointer(p: Pointer): Interface {
    return getAsInterface(p);
  }

  getCapID(): CapabilityID {
    return getCapID(this);
  }

  getClient(): Client | null {
    return getClient(this);
  }

  isValid(): boolean {
    return !!this.segment;
  }

  toString(): string {
    return format(
      "Interface_%d@%a,%d,limit:%x",
      this.segment.id,
      this.byteOffset,
      this.getCapID(),
      this._capnp.depthLimit
    );
  }
}

export function getAsInterface(p: Pointer): Interface {
  // TODO: the RPC system uses Pointers throughout, so
  // it uses this function to convert to real types, but..
  // is there something better to do?
  if (p instanceof Interface) {
    return p as Interface;
  }

  if (getTargetPointerType(p) === PointerType.OTHER) {
    return new Interface(p.segment, p.byteOffset, p._capnp.depthLimit);
  }
  throw new Error(
    `called pointerToInterface on pointer to non-interface: ${p}`
  );
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
