import initTrace from "debug";

const trace = initTrace("capnpc:errors");
trace("load");

export const GEN_EXPLICIT_DEFAULT_NON_PRIMITIVE =
  "CAPNPC-TS000 Don't know how to generate a %s field with an explicit default value.";
export const GEN_FIELD_NON_INLINE_STRUCT_LIST =
  "CAPNPC-TS001 Don't know how to generate non-inline struct lists.";
export const GEN_NODE_LOOKUP_FAIL =
  "CAPNPC-TS002 Failed to look up node id %s.";
export const GEN_NODE_UNKNOWN_TYPE =
  'CAPNPC-TS003 Don\'t know how to generate a "%s" node.';
export const GEN_SERIALIZE_UNKNOWN_VALUE =
  "CAPNPC-TS004 Don't know how to serialize a value of kind %s.";
export const GEN_UNKNOWN_STRUCT_FIELD =
  "CAPNPC-TS005 Don't know how to generate a struct field of kind %d.";
export const GEN_UNKNOWN_TYPE =
  "CAPNPC-TS006 Unknown slot type encountered: %d";
export const GEN_UNSUPPORTED_LIST_ELEMENT_TYPE =
  "CAPNPC-TS007 Encountered an unsupported list element type: %d";
export const GEN_CAPNP_TS_IMPORT_CORRUPT =
  "CAPNPC-TS008 Was able to import ts.capnp but could not locate the importPath annotation definition.";
export const GEN_TS_EMIT_FAILED =
  "CAPNPC-TS009 Failed to transpile emitted schema source code; see above for error messages.";
export const GEN_UNKNOWN_DEFAULT =
  "CAPNPC-TS010 Don't know how to generate a default value for %s fields.";
