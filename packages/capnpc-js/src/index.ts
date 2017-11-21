import initTrace from 'debug';

import * as fs from 'fs';

import * as ts from 'typescript';

import * as capnpc_ts from 'capnpc-ts';

const trace = initTrace('capnpc');
trace('load');

/**
 * The equivalent of tsconfig.json used when compiling the emitted .ts file to .js.
 *
 * The output of this tool should aim to be readable, documented javascript
 * for the developers consuming it. They can (and probably already do) transpile
 * the JS further to meet whatever ES version / module system / minification
 * needs they have.
 */
const COMPILE_OPTIONS: ts.CompilerOptions = {
  module: ts.ModuleKind.None,
  moduleResolution: ts.ModuleResolutionKind.NodeJs,
  noEmitOnError: true,
  noFallthroughCasesInSwitch: true,
  noImplicitReturns: true,
  noUnusedLocals: false,
  noUnusedParameters: false,
  preserveConstEnums: true,
  removeComments: false,
  sourceMap: false,
  strict: true,
  stripInternal: true,
  target: ts.ScriptTarget.ES2015,
};

export async function main() {
  return capnpc_ts.run().then((ctx) => {
    transpileAll(ctx);
  }).thenReturn().tapCatch((reason) => {
    // tslint:disable-next-line:no-console
    console.error(reason);
    process.exit(1);
  });
}

export function transpileAll(ctx: capnpc_ts.CodeGeneratorContext): void {

  trace('transpileAll()', ctx.files);

  const tsFilePaths = ctx.files.map((f) => f.tsPath);

  const program = ts.createProgram(tsFilePaths, COMPILE_OPTIONS);

  const emitResult = program.emit();

  if (!emitResult.emitSkipped) {

    trace('emit succeeded');

    tsFilePaths.forEach(fs.unlinkSync);

  } else {

    trace('emit failed');

    const allDiagnostics = ts.getPreEmitDiagnostics(program).concat(emitResult.diagnostics);

    allDiagnostics.forEach((diagnostic) => {

      const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n');

      if (diagnostic.file && diagnostic.start) {

        const { line, character } = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start);

        /* tslint:disable-next-line:no-console */
        console.log(`${diagnostic.file.fileName}:${line + 1}:${character + 1} ${message}`);

      } else {

        /* tslint:disable-next-line:no-console */
        console.log(`==> ${message}`);

      }

    });

    throw new Error(capnpc_ts.errors.GEN_TS_EMIT_FAILED);

  }

}
