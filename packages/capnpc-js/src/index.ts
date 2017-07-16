import initTrace from 'debug';
import * as ts from 'typescript';

import * as capnpc_ts from 'capnpc-ts';

const trace = initTrace('capnpc-js');
trace('load');

/**
 * The equivalent of tsconfig.json used when compiling the emitted .ts file to .js.
 *
 * TODO: This should be configurable somehow?
 *
 * efokschaner - I'm thinking "no" actually; here's my rationale.
 * Our top priority should be source readability from this layer.
 * Reasonable compatibility should be second.
 * The output of this tool should be thought of as source-code grade javascript
 * for the developers consuming it. They can (and probably already do) transpile
 * the JS further to meet whatever ES version / module system / minification
 * needs they have.
 */
const COMPILE_OPTIONS: ts.CompilerOptions = {
  module: ts.ModuleKind.ES2015,
  moduleResolution: ts.ModuleResolutionKind.NodeJs,
  noEmitOnError: true,
  noFallthroughCasesInSwitch: true,
  noImplicitReturns: true,
  noUnusedLocals: true,
  noUnusedParameters: true,
  preserveConstEnums: true,
  removeComments: false,
  sourceMap: true,
  strict: true,
  stripInternal: true,
  target: ts.ScriptTarget.ES2015
};

export async function main() {
  return capnpc_ts.run().then((ctx) => {
    return transpileAll(ctx);
  }).thenReturn().tapCatch((reason) => {
    // tslint:disable-next-line:no-console
    console.error(reason);
  });
}

export function transpileAll(ctx: capnpc_ts.CodeGeneratorContext): void {

  trace('transpileAll()');

  const program = ts.createProgram(ctx.files.map((f) => f.tsPath), COMPILE_OPTIONS);
  const emitResult = program.emit();

  if (emitResult.emitSkipped) {

    trace('emit failed');

    const allDiagnostics = ts.getPreEmitDiagnostics(program).concat(emitResult.diagnostics);
    allDiagnostics.forEach((diagnostic) => {

      const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n');

      if (diagnostic.file) {

        const {line, character} = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start);
        /* tslint:disable-next-line */
        console.log(`${diagnostic.file.fileName}:${line + 1}:${character + 1} ${message}`);

      } else {

        /* tslint:disable-next-line */
        console.log(`==> ${message}`);

      }

    });

    throw new Error(capnpc_ts.errors.GEN_TS_EMIT_FAILED);

  }

}