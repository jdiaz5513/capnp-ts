import tap from "tap";
import * as capnp from "capnp-ts";
import { _capnpFileAnnotations, Crate, Widget } from "./annotated.capnp.js";

const TAG = "ea88d419cd1a22c8";
const WEIGHT = "b5f27ed23bfae214";

void tap.test("runtime annotation metadata", (t) => {
  t.strictSame(_capnpFileAnnotations, [{ id: TAG, value: "file-note" }]);

  t.strictSame(Widget._capnp.annotations, [{ id: TAG, value: "widget" }]);

  t.strictSame(Widget._capnp.fieldAnnotations, {
    name: [
      { id: TAG, value: "name" },
      { id: WEIGHT, value: 42 },
    ],
  });

  t.end();
});

void tap.test("annotation lookup helpers", (t) => {
  t.equal(capnp.getAnnotation(Widget, TAG), "widget");
  t.equal(capnp.getAnnotation(Widget, WEIGHT), undefined);
  t.strictSame(capnp.getAnnotations(Widget, TAG), ["widget"]);

  // Duplicate applications are preserved in order; getAnnotation returns the last.
  t.strictSame(capnp.getAnnotations(Crate, TAG), ["first", "second"]);
  t.equal(capnp.getAnnotation(Crate, TAG), "second");

  t.end();
});

void tap.test("annotations are typed on the generic ctor interfaces", (t) => {
  // The annotations here are the test: this must compile with StructCtor's declared types, no casts.

  const generic: capnp.StructCtor<Widget> = Widget;
  const annotations: capnp.SchemaAnnotation[] | undefined = generic._capnp.annotations;
  const fieldAnnotations: { [field: string]: capnp.SchemaAnnotation[] } | undefined = generic._capnp.fieldAnnotations;

  t.strictSame(annotations, [{ id: TAG, value: "widget" }]);
  t.equal(fieldAnnotations?.name.length, 2);

  t.end();
});
