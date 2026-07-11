/**
 * Capability plumbing between structs and the message cap table.
 *
 * Generated code reads/writes interface-typed fields through getInterfaceClient and
 * setInterfaceClient; the connection encodes/decodes the message cap table to and from
 * Payload.capTable separately.
 */

import { getClient } from "../serialization/pointers/interface";
import { getPointer, getStruct, Struct } from "../serialization/pointers/struct";
import { setInterfacePointer } from "../serialization/pointers/pointer";
import { AnyStruct } from "./any-struct";
import { Client } from "./client";
import { Server } from "./server";

/** Anything a generated interface-field setter accepts. */

export type ClientLike = Client | Server | { client: Client };

/** A client whose calls all reject with `reason`. */

export function brokenClient(reason: string): Client {
  return new Client({ reason, tag: "broken" });
}

/**
 * The client for the capability at pointer field `index` of `s`. Returns a broken
 * client if the field is null or the cap table has no entry for it.
 */

export function getInterfaceClient(index: number, s: Struct): Client {
  const client = getClient(getPointer(index, s));

  return client ?? brokenClient("null capability");
}

/** Normalize a generated client wrapper or a Server to a bare Client. */

export function normalizeClient(value: ClientLike): Client {
  if (value instanceof Client) return value;
  if (value instanceof Server) return new Client({ server: value, tag: "local" });

  return value.client;
}

/**
 * Walk a PromisedAnswer transform path from a Payload's content and return the client
 * for the capability at the end of it.
 */

export function resolveCapability(payload: Struct, transform: number[]): Client {
  if (transform.length === 0) {
    return getClient(getPointer(0, payload)) ?? brokenClient("no capability in answer");
  }

  let s = getStruct(0, AnyStruct, payload);

  for (let i = 0; i < transform.length - 1; i++) {
    s = getStruct(transform[i], AnyStruct, s);
  }

  const p = getPointer(transform[transform.length - 1], s);

  return getClient(p) ?? brokenClient("no capability at transform target");
}

/**
 * Store a capability into pointer field `index` of `s`, registering it in the
 * containing message's cap table.
 */

export function setInterfaceClient(index: number, value: ClientLike, s: Struct): void {
  const capId = s.segment.message.addCap(normalizeClient(value));

  setInterfacePointer(capId, getPointer(index, s));
}
