import * as s from "capnp-ts/src/std/schema.capnp.js";
import initTrace from "debug";
import fs from "fs";
import path from "path";

import { CodeGeneratorContext } from "./code-generator-context";
import { CodeGeneratorFileContext } from "./code-generator-file-context";
import { SOURCE_COMMENT } from "./constants";
import { loadRequestedFile, lookupNode } from "./file";
import {
  generateCapnpImport,
  generateConcreteListInitializer,
  generateFileId,
  generateNestedImports,
  generateNode,
} from "./generators";

const trace = initTrace("capnpc:compile");
trace("load");

export function compile(ctx: CodeGeneratorFileContext): string {
  generateCapnpImport(ctx);

  generateNestedImports(ctx);

  generateFileId(ctx);

  lookupNode(ctx, ctx.file)
    .getNestedNodes()
    .map((n) => lookupNode(ctx, n))
    .forEach((n) => generateNode(ctx, n));

  ctx.concreteLists.forEach(([fullClassName, field]) => generateConcreteListInitializer(ctx, fullClassName, field));

  return SOURCE_COMMENT + ctx.sourceParts.join("\n") + "\n";
}

export function loadRequest(req: s.CodeGeneratorRequest): CodeGeneratorContext {
  trace("loadRequest(%s)", req);

  const ctx = new CodeGeneratorContext();

  ctx.files = req.getRequestedFiles().map((file) => loadRequestedFile(req, file));

  return ctx;
}

export function printSourceFiles(ctx: CodeGeneratorContext): string[] {
  trace("printSourceFiles()");

  return ctx.files.map(compile);
}

export function writeTsFiles(ctx: CodeGeneratorContext): void {
  trace("writeTsFiles()");

  ctx.files.forEach((f) => {
    trace("writing %s", f.tsPath);

    fs.mkdirSync(path.dirname(f.tsPath), { recursive: true });

    fs.writeFileSync(f.tsPath, compile(f), { encoding: "utf-8" });
  });
}
