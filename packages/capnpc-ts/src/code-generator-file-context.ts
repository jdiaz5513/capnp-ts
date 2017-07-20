/**
 * @author jdiaz5513
 */

import * as s from 'capnp-ts/lib/std/schema.capnp';
import * as ts from 'typescript';

/**
 * Contains state that's passed around and mutated during the compilation steps.
 *
 * @export
 * @class CodeGeneratorFileContext
 */

export class CodeGeneratorFileContext {

  tsPath: string;
  concreteLists: Array<[string, s.Field]>;
  file: s.CodeGeneratorRequest_RequestedFile;
  generatedNodeIds: string[];
  nodes: s.Node[];
  req: s.CodeGeneratorRequest;
  sourceFile: ts.SourceFile;

  toString() {

    return this.file ? this.file.getFilename() : 'CodeGeneratorFileContext()';

  }

}
