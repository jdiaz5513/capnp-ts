/**
 * This file contains all the error strings used in the library. Also contains silliness.
 *
 * @author jdiaz5513
 */

import initTrace from "debug";

import { MAX_SEGMENT_LENGTH } from "./constants";

const trace = initTrace("capnp:errors");
trace("load");

// Invariant violations (sometimes known as "precondition failed").
//
// All right, hold up the brakes. This is a serious 1 === 0 WHAT THE FAILURE moment here. Tell the SO's you won't be
// home for dinner.

export const INVARIANT_UNREACHABLE_CODE = "CAPNP-TS000 Unreachable code detected.";

export function assertNever(n: never): never {
  // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
  throw new Error(INVARIANT_UNREACHABLE_CODE + ` (never block hit with: ${n})`);
}

// Message errors.
//
// Now who told you it would be a good idea to fuzz the inputs? You just made the program sad.

export const MSG_INVALID_FRAME_HEADER =
  "CAPNP-TS001 Attempted to parse an invalid message frame header; are you sure this is a Cap'n Proto message?";
export const MSG_NO_SEGMENTS_IN_ARENA = "CAPNP-TS002 Attempted to preallocate a message with no segments in the arena.";
export const MSG_PACK_NOT_WORD_ALIGNED = "CAPNP-TS003 Attempted to pack a message that was not word-aligned.";
export const MSG_SEGMENT_OUT_OF_BOUNDS = "CAPNP-TS004 Segment ID %X is out of bounds for message %s.";
export const MSG_SEGMENT_TOO_SMALL =
  "CAPNP-TS005 First segment must have at least enough room to hold the root pointer (8 bytes).";

// Used for methods that are not yet implemented.
//
// My bad. I'll get to it. Eventually.

export const NOT_IMPLEMENTED = "CAPNP-TS006 %s is not implemented.";

// Pointer-related errors.
//
// Look, this is probably the hardest part of the code. Cut some slack here! You probably found a bug.

export const PTR_ADOPT_COMPOSITE_STRUCT = "CAPNP-TS007 Attempted to adopt a struct into a composite list (%s).";
export const PTR_ADOPT_WRONG_MESSAGE = "CAPNP-TS008 Attempted to adopt %s into a pointer in a different message %s.";
export const PTR_ALREADY_ADOPTED = "CAPNP-TS009 Attempted to adopt %s more than once.";
export const PTR_COMPOSITE_SIZE_UNDEFINED =
  "CAPNP-TS010 Attempted to set a composite list without providing a composite element size.";
export const PTR_DEPTH_LIMIT_EXCEEDED = "CAPNP-TS011 Nesting depth limit exceeded for %s.";
export const PTR_DISOWN_COMPOSITE_STRUCT =
  "CAPNP-TS012 Attempted to disown a struct member from a composite list (%s).";
export const PTR_INIT_COMPOSITE_STRUCT =
  "CAPNP-TS013 Attempted to initialize a struct member from a composite list (%s).";
export const PTR_INIT_NON_GROUP = "CAPNP-TS014 Attempted to initialize a group field with a non-group struct class.";
export const PTR_INVALID_FAR_TARGET = "CAPNP-TS015 Target of a far pointer (%s) is another far pointer.";
export const PTR_INVALID_LIST_SIZE = "CAPNP-TS016 Invalid list element size: %x.";
export const PTR_INVALID_POINTER_TYPE = "CAPNP-TS017 Invalid pointer type: %x.";
export const PTR_INVALID_UNION_ACCESS =
  "CAPNP-TS018 Attempted to access getter on %s for union field %s that is not currently set (wanted: %d, found: %d).";
export const PTR_OFFSET_OUT_OF_BOUNDS = "CAPNP-TS019 Pointer offset %a is out of bounds for underlying buffer.";
export const PTR_STRUCT_DATA_OUT_OF_BOUNDS =
  "CAPNP-TS020 Attempted to access out-of-bounds struct data (struct: %s, %d bytes at %a, data words: %d).";
export const PTR_STRUCT_POINTER_OUT_OF_BOUNDS =
  "CAPNP-TS021 Attempted to access out-of-bounds struct pointer (%s, index: %d, length: %d).";
export const PTR_TRAVERSAL_LIMIT_EXCEEDED = "CAPNP-TS022 Traversal limit exceeded! Slow down! %s";
export const PTR_WRONG_LIST_TYPE = "CAPNP-TS023 Cannot convert %s to a %s list.";
export const PTR_WRONG_POINTER_TYPE = "CAPNP-TS024 Attempted to convert pointer %s to a %s type.";
export const PTR_WRONG_COMPOSITE_DATA_SIZE =
  "CAPNP-TS025 Attempted to convert %s to a composite list with the wrong data size (found: %d).";
export const PTR_WRONG_COMPOSITE_PTR_SIZE =
  "CAPNP-TS026 Attempted to convert %s to a composite list with the wrong pointer size (found: %d).";
export const PTR_WRONG_STRUCT_DATA_SIZE =
  "CAPNP-TS027 Attempted to convert %s to a struct with the wrong data size (found: %d).";
export const PTR_WRONG_STRUCT_PTR_SIZE =
  "CAPNP-TS028 Attempted to convert %s to a struct with the wrong pointer size (found: %d).";

// Custom error messages for the built-in `RangeError` class.
//
// You don't get a witty comment with these.

export const RANGE_INT32_OVERFLOW = "CAPNP-TS029 32-bit signed integer overflow detected.";
export const RANGE_INT64_UNDERFLOW = "CAPNP-TS030 Buffer is not large enough to hold a word.";
export const RANGE_INVALID_UTF8 = "CAPNP-TS031 Invalid UTF-8 code sequence detected.";
export const RANGE_SIZE_OVERFLOW = `CAPNP-TS032 Size %x exceeds maximum ${MAX_SEGMENT_LENGTH.toString(16)}.`;
export const RANGE_UINT32_OVERFLOW = "CAPNP-TS033 32-bit unsigned integer overflow detected.";

// Segment-related errors.
//
// These suck. Deal with it.

export const SEG_BUFFER_NOT_ALLOCATED =
  "CAPNP-TS034 allocate() needs to be called at least once before getting a buffer.";
export const SEG_GET_NON_ZERO_SINGLE =
  "CAPNP-TS035 Attempted to get a segment other than 0 (%d) from a single segment arena.";
export const SEG_ID_OUT_OF_BOUNDS = "CAPNP-TS036 Attempted to get an out-of-bounds segment (%d).";
export const SEG_NOT_WORD_ALIGNED = "CAPNP-TS037 Segment buffer length %d is not a multiple of 8.";
export const SEG_REPLACEMENT_BUFFER_TOO_SMALL =
  "CAPNP-TS038 Attempted to replace a segment buffer with one that is smaller than the allocated space.";
export const SEG_SIZE_OVERFLOW = `CAPNP-TS039 Requested size %x exceeds maximum value (${MAX_SEGMENT_LENGTH}).`;

// Custom error messages for the built-in `TypeError` class.
//
// If it looks like a duck, quacks like an elephant, and has hooves for feet, it's probably JavaScript.

export const TYPE_COMPOSITE_SIZE_UNDEFINED =
  "CAPNP-TS040 Must provide a composite element size for composite list pointers.";
export const TYPE_GET_GENERIC_LIST = "CAPNP-TS041 Attempted to call get() on a generic list.";
export const TYPE_SET_GENERIC_LIST = "CAPNP-TS042 Attempted to call set() on a generic list.";

export const PTR_WRITE_CONST_LIST = "CAPNP-TS043 Attempted to write to a const list.";
export const PTR_WRITE_CONST_STRUCT = "CAPNP-TS044 Attempted to write to a const struct.";
