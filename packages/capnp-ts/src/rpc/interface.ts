import { Segment } from "../serialization/segment";
import { CapabilityID } from "./capability";
import {
  Pointer,
  getTargetPointerType
} from "../serialization/pointers/pointer";
import { Client } from "./client";
import { PointerType } from "../serialization/pointers/pointer-type";

// An Interface is a reference to a client in a message's capability table.
export interface Interface {
  seg: Segment;
  cap: CapabilityID;
}

export function pointerToInterface(p: Pointer): Interface {
  // see https://capnproto.org/encoding.html, interfaces are
  // "other" pointers.
  if (getTargetPointerType(p) === PointerType.OTHER) {
    return <Interface>{
      cap: p.segment.getUint32(p.byteOffset + 4), // FIXME: that belongs somewhere else
      seg: p.segment
    };
  }
  throw new Error(
    `called pointerToInterface on pointer to non-interface: ${p}`
  );
}

export function isInterfaceValid(i: Interface): boolean {
  return !!i.seg;
}

export function interfaceToClient(i: Interface): Client | null {
  if (!i.seg) {
    return null;
  }

  const tab = i.seg.message._capnp.capTable;
  if (!tab || i.cap >= tab.length) {
    return null;
  }

  return tab[i.cap];
}
