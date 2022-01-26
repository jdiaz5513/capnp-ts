import * as s from "capnp-ts/src/std/schema.capnp.js";
import initTrace from "debug";
import fs from "fs";
import mkdirp from "mkdirp";
import path from "path";
import ts from "typescript";

import { CodeGeneratorContext } from "./code-generator-context";
import { CodeGeneratorFileContext } from "./code-generator-file-context";
import { SOURCE_COMMENT } from "./constants";
import { loadRequestedFile, lookupNode } from "./file";
import {
  generateCapnpImport,
  generateConcreteListInitializer,
  generateFileId,
  generateNode,
  generateNestedImports,
} from "./generators";

const trace = initTrace("capnpc:compile");

export function compile(ctx: CodeGeneratorFileContext): string {
  generateCapnpImport(ctx);

  generateNestedImports(ctx);

  generateFileId(ctx);

  lookupNode(ctx, ctx.file)
    .getNestedNodes()
    .map((n) => lookupNode(ctx, n))
    .forEach((n) => generateNode(ctx, n));

  ctx.concreteLists.forEach(([fullClassName, field]) => generateConcreteListInitializer(ctx, fullClassName, field));

  const sourceFile = ts.createSourceFile(ctx.tsPath, "", ts.ScriptTarget.Latest, false, ts.ScriptKind.TS);
  const printer = ts.createPrinter();
  const source = ctx.statements.map((s) => printer.printNode(ts.EmitHint.Unspecified, s, sourceFile)).join("\n") + "\n";

  return SOURCE_COMMENT + source;
}

export function loadRequest(req: s.CodeGeneratorRequest): CodeGeneratorContext {
  const ctx = new CodeGeneratorContext();

  ctx.files = req.getRequestedFiles().map((file) => loadRequestedFile(req, file));

  return ctx;
}

export function printSourceFiles(ctx: CodeGeneratorContext): string[] {
  return ctx.files.map(compile);
}

export function writeTsFiles(ctx: CodeGeneratorContext): void {
  ctx.files.forEach((f) => {
    trace("writing %s", f.tsPath);

    mkdirp.sync(path.dirname(f.tsPath));

    fs.writeFileSync(f.tsPath, compile(f), { encoding: "utf-8" });
  });
}
