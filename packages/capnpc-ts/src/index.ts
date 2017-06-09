import * as capnp from 'capnp-ts';
import * as s from 'capnp-ts/lib/std/schema.capnp';
import initTrace from 'debug';

import {loadRequest, writeTsFiles} from './compiler';

const trace = initTrace('capnpc');
trace('load');

const chunks: Buffer[] = [];

export function main() {

  process.stdin.on('data', (chunk: Buffer) => {

    trace('reading data chunk (%d bytes)', chunk.byteLength);

    chunks.push(chunk);

  });

  process.stdin.on('end', () => {

    trace('read complete');

    const reqBuffer = new Buffer(chunks.reduce((l, chunk) => l + chunk.byteLength, -1));

    let i = 0;

    chunks.forEach((chunk, j) => {

      if (j === chunks.length - 1) {

        // Exclude the EOF byte.

        chunk.copy(reqBuffer, i, 0, chunk.byteLength - 1);

      } else {

        chunk.copy(reqBuffer, i);

      }

      i += chunk.byteLength;

    });

    trace(reqBuffer);

    const message = capnp.Message.fromBuffer(reqBuffer);

    trace('message: %s', message.dump());

    const req = message.getRoot(s.CodeGeneratorRequest);

    trace('%s', req);

    const ctx = loadRequest(req);

    writeTsFiles(ctx);
    // NOTE: Uncomment this to enable transpilation to JS, kinda broken right now.
    // transpileAll(ctx);

  });

}
