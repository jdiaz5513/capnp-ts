import * as Bluebird from 'bluebird';
import * as capnp from 'capnp-ts';
import * as s from 'capnp-ts/lib/std/schema.capnp';

import {CodeGeneratorContext} from './code-generator-context';
export {CodeGeneratorContext} from './code-generator-context';

import initTrace from 'debug';

import {loadRequest, writeTsFiles} from './compiler';

const trace = initTrace('capnpc');
trace('load');

import * as E from './errors';
export let errors = E;

export async function main(): Promise<void> {
  return run().thenReturn().tapCatch((reason) => {
    // tslint:disable-next-line:no-console
    console.error(reason);
    process.exit(1);
  });
}

export async function run(): Bluebird<CodeGeneratorContext> {

  return Bluebird.try(() => {

    const chunks: Buffer[] = [];

    process.stdin.on('data', (chunk: Buffer) => {

      trace('reading data chunk (%d bytes)', chunk.byteLength);

      chunks.push(chunk);

    });

    return (new Bluebird<void>((resolve) => {

      process.stdin.on('end', () => {

        trace('read complete');

        resolve();

      });

    })).then(() => {

      const reqBuffer = new Buffer(chunks.reduce((l, chunk) => l + chunk.byteLength, 0));

      let i = 0;

      chunks.forEach((chunk) => {

        chunk.copy(reqBuffer, i);

        i += chunk.byteLength;

      });

      trace('reqBuffer (length: %d)', reqBuffer.length, reqBuffer);

      const message = capnp.Message.fromBuffer(reqBuffer);

      trace('message: %s', message.dump());

      const req = message.getRoot(s.CodeGeneratorRequest);

      trace('%s', req);

      const ctx = loadRequest(req);

      writeTsFiles(ctx);

      return ctx;
    });
  });
}
