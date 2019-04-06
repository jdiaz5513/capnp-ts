import { Struct } from "../serialization/pointers/struct";
import { Segment } from "../serialization/segment";
import { Message } from "../serialization/message";
import { Method } from "./method";

// The Call type holds the record for an outgoing interface call.
export type Call<P extends Struct, R extends Struct> =
  | FuncCall<P, R>
  | DataCall<P, R>;

interface BaseCall<P extends Struct, R extends Struct> {
  // Method is the interface ID and method ID, along with the optional name, of
  // the method to call.
  method: Method<P, R>;
}

type FuncCall<P extends Struct, R extends Struct> = BaseCall<P, R> & {
  // ParamsFunc is a function that populates an allocated struct with
  // the parameters for the call.  ParamsSize determines the size of the
  // struct to allocate.  This is used when application code is using a
  // client.  These settings should be set together; they are mutually
  // exclusive with Params.
  paramsFunc?(params: P): void;
};

type DataCall<P extends Struct, R extends Struct> = BaseCall<P, R> & {
  // Params is a struct containing parameters for the call.
  // This should be set when the RPC system receives a call for an
  // exported interface.  It is mutually exclusive with ParamsFunc
  // and ParamsSize.
  params: P;
};

export function isFuncCall<P extends Struct, R extends Struct>(
  call: Call<P, R>
): call is FuncCall<P, R> {
  return !isDataCall(call);
}

export function isDataCall<P extends Struct, R extends Struct>(
  call: Call<P, R>
): call is DataCall<P, R> {
  return !!(call as DataCall<P, R>).params;
}

// Copy clones a call, ensuring that its Params are placed.
// If Call.ParamsFunc is nil, then the same Call will be returned.
export function copyCall<P extends Struct, R extends Struct>(
  call: Call<P, R>,
  s?: Segment
): Call<P, R> {
  if (isDataCall(call)) {
    return call;
  }

  const p = placeParams(call, s);
  return {
    method: call.method,
    params: p
  };
}

export function placeParams<P extends Struct, R extends Struct>(
  call: Call<P, R>,
  s?: Segment
): P {
  if (isDataCall(call)) {
    return call.params;
  }

  if (s) {
    // TODO: figure out how to place in same segment
    // tslint:disable
    console.warn(`placeParams: ignoring specified segment for now`);
  }
  const msg = new Message();
  let p = new call.method.ParamsClass(msg.getSegment(0), 0);
  Struct.initStruct(call.method.ParamsClass._capnp.size, p);
  if (call.paramsFunc) {
    call.paramsFunc(p);
  }
  return p;
}
