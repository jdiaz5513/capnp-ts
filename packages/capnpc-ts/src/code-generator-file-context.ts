/**
 * @author jdiaz5513
 */

import * as s from "capnp-ts/src/std/schema.capnp.js";

export class CodeGeneratorFileContext {
  concreteLists: Array<[string, s.Field]>;
  file: s.CodeGeneratorRequest_RequestedFile;
  generatedNodeIds: string[];
  implicitScopes: Map<string, unknown>;
  imports: s.CodeGeneratorRequest_RequestedFile_Import[];
  nodes: s.Node[];
  req: s.CodeGeneratorRequest;
  /** Emitted source text parts, joined with newlines to form the output file. */
  sourceParts: string[];
  tsPath: string;

  constructor(req: s.CodeGeneratorRequest, file: s.CodeGeneratorRequest_RequestedFile) {
    this.req = req;
    this.file = file;
    this.nodes = req.getNodes().toArray();
    this.concreteLists = [];
    this.generatedNodeIds = [];
    this.implicitScopes = new Map();
    this.sourceParts = [];
    this.tsPath = "";
    this.imports = file.getImports().toArray();
  }

  toString(): string {
    return this.file ? this.file.getFilename() : "CodeGeneratorFileContext()";
  }
}
