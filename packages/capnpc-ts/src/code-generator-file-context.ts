/**
 * @author jdiaz5513
 */

import * as s from 'capnp-ts/lib/std/schema.capnp';
import * as ts from 'typescript';

export class CodeGeneratorFileContext {

  tsPath: string;
  concreteLists: Array<[string, s.Field]>;
  file: s.CodeGeneratorRequest_RequestedFile;
  generatedNodeIds: string[];
  nodes: s.Node[];
  req: s.CodeGeneratorRequest;
  sourceFile: ts.SourceFile;
  namedImports: string[];

  constructor(req: s.CodeGeneratorRequest, file: s.CodeGeneratorRequest_RequestedFile) {
    this.req = req;
    this.file = file;
    this.nodes = req.getNodes().toArray();
    this.concreteLists = [];
    this.generatedNodeIds = [];
  }

  toString() {

    return this.file ? this.file.getFilename() : 'CodeGeneratorFileContext()';

  }

}
