import * as s from 'capnp-ts/lib/std/schema.capnp';
import initTrace from 'debug';
import * as fs from 'fs';
import * as ts from 'typescript';

import {CodeGeneratorContext} from './code-generator-context';
import {CodeGeneratorFileContext} from './code-generator-file-context';
import {SOURCE_COMMENT} from './constants';
import {loadRequestedFile, lookupNode} from './file';
import {
  generateCapnpImport,
  generateConcreteListInitializer,
  generateFileId,
  generateNode,
} from './generators';

const trace = initTrace('capnpc:compile');
trace('load');

export function compile(ctx: CodeGeneratorFileContext): string {

  generateCapnpImport(ctx);

  generateFileId(ctx);

  lookupNode(ctx, ctx.file).getNestedNodes().map((n) => lookupNode(ctx, n)).forEach((n) => generateNode(ctx, n));

  ctx.concreteLists.forEach(([fullClassName, field]) => generateConcreteListInitializer(ctx, fullClassName, field));

  return SOURCE_COMMENT + ts.createPrinter({newLine: ts.NewLineKind.LineFeed}).printFile(ctx.sourceFile);

}

export function loadRequest(req: s.CodeGeneratorRequest): CodeGeneratorContext {

  trace('loadRequest(%s)', req);

  const ctx = new CodeGeneratorContext();

  ctx.files = req.getRequestedFiles().map((file) => loadRequestedFile(req, file));

  return ctx;

}

export function printSourceFiles(ctx: CodeGeneratorContext): string[] {

  trace('printSourceFiles()');

  return ctx.files.map(compile);

}

export function writeTsFiles(ctx: CodeGeneratorContext): void {

  trace('writeTsFiles()');

  ctx.files.forEach((f) => {

    trace('writing %s', f.tsPath);

    fs.writeFileSync(f.tsPath, compile(f), {encoding: 'utf-8'});

  });

}
