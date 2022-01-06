import * as capnp from "capnp-ts";
import * as s from "capnp-ts/src/std/schema.capnp.js";
import initTrace from "debug";
import * as fs from "fs";
import ts from "typescript";
import { CodeGeneratorContext } from "./code-generator-context";
import { loadRequest, writeTsFiles } from "./compiler";
import * as E from "./errors";

const trace = initTrace("capnpc");
trace("load");

/**
 * The equivalent of tsconfig.json used when compiling the emitted .ts file to .js.
 *
 * The output of this tool should aim to be readable, documented javascript
 * for the developers consuming it. They can (and probably already do) transpile
 * the JS further to meet whatever ES version / module system / minification
 * needs they have.
 */
const COMPILE_OPTIONS: ts.CompilerOptions = {
  declaration: true,
  module: ts.ModuleKind.None,
  moduleResolution: ts.ModuleResolutionKind.NodeJs,
  noEmitOnError: false,
  noFallthroughCasesInSwitch: true,
  noImplicitReturns: true,
  noUnusedLocals: false,
  noUnusedParameters: false,
  preserveConstEnums: true,
  removeComments: false,
  skipLibCheck: true,
  sourceMap: false,
  strict: true,
  stripInternal: true,
  target: ts.ScriptTarget.ES2015,
};

export async function main(): Promise<void> {
  try {
    const ctx = await run();
    transpileAll(ctx);
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

export function transpileAll(ctx: CodeGeneratorContext): void {
  trace("transpileAll()", ctx.files);

  const tsFilePaths = ctx.files.map((f) => f.tsPath);

  const program = ts.createProgram(tsFilePaths, COMPILE_OPTIONS);

  const emitResult = program.emit();

  if (
    emitResult.diagnostics.every(
      (d) =>
        d.category !== ts.DiagnosticCategory.Error ||
        // "Cannot find module" errors are typically only temporary and will reappear quickly if it's an actual problem.
        ts.flattenDiagnosticMessageText(d.messageText, "\n").includes("Cannot find module")
    )
  ) {
    trace("emit succeeded");

    tsFilePaths.forEach(fs.unlinkSync);
  } else {
    trace("emit failed");

    const allDiagnostics = ts.getPreEmitDiagnostics(program).concat(emitResult.diagnostics);

    allDiagnostics.forEach((diagnostic) => {
      const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n");

      if (diagnostic.file && diagnostic.start) {
        const { line, character } = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start);

        console.log(`${diagnostic.file.fileName}:${line + 1}:${character + 1} ${message}`);
      } else {
        console.log(`==> ${message}`);
      }
    });

    throw new Error(E.GEN_TS_EMIT_FAILED);
  }
}
