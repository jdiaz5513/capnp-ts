/**
 * @author jdiaz5513
 */

import tap from "tap";

import * as capnp from "capnp-ts";
import { CodeGeneratorRequest } from "capnp-ts/src/std/schema.capnp.js";
import { compareBuffers, readFileBuffer } from "../util";

const SCHEMA_MESSAGE = readFileBuffer("test/data/schema.bin");

const SCHEMA_FILE_ID = capnp.Int64.fromHexString("a93fc509624c72d9");

void tap.test("schema roundtrip", (t) => {
  const message = new capnp.Message(SCHEMA_MESSAGE, false);
  const req = message.getRoot(CodeGeneratorRequest);

  t.type(req, CodeGeneratorRequest);

  const capnpVersion = req.getCapnpVersion();

  t.equal(capnpVersion.getMajor(), 0);
  t.equal(capnpVersion.getMinor(), 6);
  t.equal(capnpVersion.getMicro(), 0);

  const requestedFiles = req.getRequestedFiles();

  t.equal(requestedFiles.getLength(), 1);

  const requestedFile = requestedFiles.get(0);
  const filename = requestedFile.getFilename();

  t.equal(filename, "packages/capnp-ts/src/std/schema.capnp");

  const requestedFileId = requestedFile.getId();

  compareBuffers(t, requestedFileId.buffer.buffer, SCHEMA_FILE_ID.buffer.buffer);

  const out = message.toArrayBuffer();

  compareBuffers(t, out, SCHEMA_MESSAGE);

  t.end();
});
