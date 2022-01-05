/**
 * @author jdiaz5513
 */

import * as s from "capnp-ts/src/std/schema.capnp.js";
import ts from "typescript";

export class CodeGeneratorFileContext {
  concreteLists: Array<[string, s.Field]>;
  file: s.CodeGeneratorRequest_RequestedFile;
  generatedNodeIds: string[];
  imports: s.CodeGeneratorRequest_RequestedFile_Import[];
  nodes: s.Node[];
  req: s.CodeGeneratorRequest;
  statements: ts.Statement[];
  tsPath: string;

  constructor(req: s.CodeGeneratorRequest, file: s.CodeGeneratorRequest_RequestedFile) {
    this.req = req;
    this.file = file;
    this.nodes = req.getNodes().toArray();
    this.concreteLists = [];
    this.generatedNodeIds = [];
    this.statements = [];
    this.tsPath = "";
    this.imports = file.getImports().toArray();
  }

  toString(): string {
    return this.file ? this.file.getFilename() : "CodeGeneratorFileContext()";
  }
}
