import * as capnp from "capnp-ts";
import * as s from "capnp-ts/src/std/schema.capnp.js";

import { CodeGeneratorContext } from "./code-generator-context";
export { CodeGeneratorContext } from "./code-generator-context";

import initTrace from "debug";

import { loadRequest, writeTsFiles } from "./compiler";

const trace = initTrace("capnpc");
trace("load");

import * as E from "./errors";
// eslint-disable-next-line prefer-const
export let errors = E;

export async function main(): Promise<void> {
  try {
    await run();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

export async function run(): Promise<CodeGeneratorContext> {
  const chunks: Buffer[] = [];

  process.stdin.on("data", (chunk: Buffer) => {
    trace("reading data chunk (%d bytes)", chunk.byteLength);
    chunks.push(chunk);
  });

  await new Promise((resolve) => {
    process.stdin.on("end", resolve);
  });

  const reqBuffer = Buffer.alloc(chunks.reduce((l, chunk) => l + chunk.byteLength, 0));

  let i = 0;
  chunks.forEach((chunk) => {
    chunk.copy(reqBuffer, i);
    i += chunk.byteLength;
  });

  trace("reqBuffer (length: %d)", reqBuffer.length, reqBuffer);

  const message = new capnp.Message(reqBuffer, false);

  trace("message: %s", message.dump());

  const req = message.getRoot(s.CodeGeneratorRequest);

  trace("%s", req);

  const ctx = loadRequest(req);

  writeTsFiles(ctx);

  return ctx;
}
