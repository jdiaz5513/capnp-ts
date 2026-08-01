import tap from "tap";

import { enumDecl, escapeString, klass, method, num, str } from "../../src/text";

void tap.test("enumDecl", (t) => {
  t.equal(enumDecl("Foo", [{ name: "BAR" }, { name: "BAZ" }]), "export enum Foo {\n    BAR,\n    BAZ\n}");
  t.equal(
    enumDecl("Foo_Which", [
      { name: "BAR", value: 0 },
      { name: "BAZ", value: 1 },
    ]),
    "export enum Foo_Which {\n    BAR = 0,\n    BAZ = 1\n}",
  );

  t.end();
});

void tap.test("escapeString/str", (t) => {
  t.equal(str("foo"), '"foo"');
  t.equal(escapeString('say "hi"'), 'say \\"hi\\"');
  t.equal(escapeString("back\\slash"), "back\\\\slash");
  t.equal(escapeString("tab\there"), "tab\\there");
  t.equal(escapeString("new\nline"), "new\\nline");
  t.equal(escapeString("\0"), "\\0", "bare null escapes short");
  t.equal(escapeString("\u0000" + "1"), "\\x001", "null before digit uses \\x00");
  t.equal(escapeString("café"), "caf\\u00e9", "non-ascii escapes to unicode");
  t.equal(escapeString("\u2028"), "\\u2028", "line separator");

  t.end();
});

void tap.test("klass", (t) => {
  t.equal(
    klass("Foo", ["static readonly _capnp = {};", 'toString(): string { return "x"; }']),
    'export class Foo extends __S {\n    static readonly _capnp = {};\n    toString(): string { return "x"; }\n}',
  );

  t.end();
});

void tap.test("method", (t) => {
  t.equal(
    method("getFoo", [], "number", ["__S.getInt32(0, this)"]),
    "getFoo(): number { return __S.getInt32(0, this); }",
    "single statement with non-void return is single-line",
  );
  t.equal(
    method("setFoo", ["value: number"], "void", ["__S.setInt32(0, value, this)"]),
    "setFoo(value: number): void { __S.setInt32(0, value, this); }",
    "void return emits no return keyword",
  );
  t.equal(
    method("getFoo", [], "Foo", [
      '__S.testWhich("foo", __S.getUint16(0, this), 1, this)',
      "__S.getStruct(1, Foo, this)",
    ]),
    'getFoo(): Foo {\n    __S.testWhich("foo", __S.getUint16(0, this), 1, this);\n    return __S.getStruct(1, Foo, this);\n}',
    "two statements go multi-line, last one returned",
  );

  t.end();
});

void tap.test("num", (t) => {
  t.equal(num(0), "0");
  t.equal(num(-0), "0", "-0 collapses to 0");
  t.equal(num(-5), "-5");
  t.equal(num(1.5), "1.5");
  t.equal(num(2e30), "2e+30");
  t.equal(num(-1.23e47), "-1.23e+47");
  t.equal(num(NaN), "NaN");
  t.equal(num(Infinity), "Infinity");
  t.equal(num(-Infinity), "-Infinity");

  t.end();
});
