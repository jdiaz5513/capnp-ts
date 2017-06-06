/**
 * @author jdiaz5513
 */

import * as capnp from '../../lib';
import {CodeGeneratorRequest} from '../../lib/std/schema.capnp';
import {compareBuffers, readFileBuffer, tap} from '../util';

const SCHEMA_MESSAGE = readFileBuffer('test/data/schema.bin');

const SCHEMA_FILE_ID = capnp.Int64.fromHexString('a93fc509624c72d9');

tap.test('schema roundtrip', (t) => {

  const message = capnp.Message.fromArrayBuffer(SCHEMA_MESSAGE);
  const cgr = message.getRoot(CodeGeneratorRequest);

  t.type(cgr, CodeGeneratorRequest);

  const capnpVersion = cgr.getCapnpVersion();

  t.equal(capnpVersion.getMajor(), 0);
  t.equal(capnpVersion.getMinor(), 6);
  t.equal(capnpVersion.getMicro(), 0);

  const requestedFiles = cgr.getRequestedFiles();

  t.equal(requestedFiles.getLength(), 1);

  const requestedFile = requestedFiles.get(0);
  const filename = requestedFile.getFilename();

  t.equal(filename, 'packages/capnp-ts/src/std/schema.capnp');

  const requestedFileId = requestedFile.getId();

  compareBuffers(t, requestedFileId.buffer.buffer, SCHEMA_FILE_ID.buffer.buffer);

  const out = message.toArrayBuffer();

  compareBuffers(t, out, SCHEMA_MESSAGE);

  t.end();

});
