import { tap, readFileBuffer } from "../util";
import * as capnp from "capnp-ts";
import * as s from "capnp-ts/lib/std/schema.capnp";
import { createValueExpression } from "../../lib/ast-creators";
import * as ts from "typescript";

const TEST_REQUEST = readFileBuffer("test/data/test-request.bin");

tap.test("createValueExpression", t => {
  const m = new capnp.Message(TEST_REQUEST, false);

  // Find a node with a default pointer value to play around with.
  const node = m
    .getRoot(s.CodeGeneratorRequest)
    .getNodes()
    .find(n => n.getDisplayName().split(":")[1] === "TestDefaults");

  if (node === undefined) {
    t.fail();
    return;
  }

  const value = node
    .getStruct()
    .getFields()
    .get(29)
    .getSlot()
    .getDefaultValue();
  const printer = ts.createPrinter();
  const sourceFile = ts.createSourceFile("", "", ts.ScriptTarget.ES2017);

  t.equal(
    printer.printNode(
      ts.EmitHint.Expression,
      createValueExpression(value),
      sourceFile
    ),
    "capnp.readRawPointer(new Uint8Array([0x10, 0x07, 0x11, 0x01, 0x1e, 0x11, 0x09, 0x32, 0x11, 0x09, 0x32, " +
      "0x11, 0x09, 0x2a, 0x1f, 0x70, 0x6c, 0x75, 0x67, 0x68, 0x1f, 0x78, 0x79, 0x7a, 0x7a, 0x79, 0x0f, 0x74, 0x68, " +
      "0x75, 0x64]).buffer)"
  );

  t.end();
});
