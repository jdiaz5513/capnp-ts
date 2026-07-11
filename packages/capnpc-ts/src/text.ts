/**
 * Plain-text emission helpers.
 *
 * Formatting rules (4-space indent, single-line short method bodies, double-quoted
 * string escaping) match TypeScript printer output so generated code style is stable
 * across compiler versions.
 */

export const INDENT = "    ";

const ESCAPED_CHARS = new Map<string, string>([
  ["\\", "\\\\"],
  ['"', '\\"'],
  ["\b", "\\b"],
  ["\t", "\\t"],
  ["\n", "\\n"],
  ["\v", "\\v"],
  ["\f", "\\f"],
  ["\r", "\\r"],
  [" ", "\\u2028"],
  [" ", "\\u2029"],
  ["", "\\u0085"],
]);

export function enumDecl(name: string, members: { name: string; value?: number }[]): string {
  const body = members.map((m) => indent(m.value === undefined ? m.name : `${m.name} = ${m.value}`)).join(",\n");

  return `export enum ${name} {\n${body}\n}`;
}

export function escapeString(value: string): string {
  let out = "";

  for (let i = 0; i < value.length; i++) {
    const c = value[i];
    const code = value.charCodeAt(i);
    const mapped = ESCAPED_CHARS.get(c);

    if (mapped !== undefined) {
      out += mapped;
    } else if (code === 0) {
      // "\0" unless followed by a digit, which would change its meaning.
      out += i + 1 < value.length && value[i + 1] >= "0" && value[i + 1] <= "9" ? "\\x00" : "\\0";
    } else if (code < 0x20 || code > 0x7f) {
      out += `\\u${code.toString(16).padStart(4, "0")}`;
    } else {
      out += c;
    }
  }

  return out;
}

export function indent(text: string): string {
  return text
    .split("\n")
    .map((line) => INDENT + line)
    .join("\n");
}

export function klass(name: string, members: string[]): string {
  return `export class ${name} extends __S {\n${members.map(indent).join("\n")}\n}`;
}

export function method(
  name: string,
  parameters: string[],
  returnType: string,
  statements: string[],
  allowSingleLine = true,
): string {
  const returns = returnType !== "void";
  const stmts = statements.map((s, i) => (i === statements.length - 1 && returns ? `return ${s};` : `${s};`));
  const signature = `${name}(${parameters.join(", ")}): ${returnType}`;

  if (allowSingleLine && stmts.length < 2) {
    return `${signature} { ${stmts.join("")}${stmts.length > 0 ? " " : ""}}`;
  }

  return `${signature} {\n${stmts.map(indent).join("\n")}\n}`;
}

export function num(value: number): string {
  if (Object.is(value, -0)) return "0";

  return String(value);
}

export function str(value: string): string {
  return `"${escapeString(value)}"`;
}
