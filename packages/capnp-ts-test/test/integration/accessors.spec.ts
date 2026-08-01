import tap from "tap";

import * as capnp from "capnp-ts";

import { AddressBook, Person_PhoneNumber_Type } from "./serialization-demo.capnp.js";
import { TestAllTypes, TestEnum } from "./test.capnp.js";

void tap.test("property accessors mirror get/set methods", (t) => {
  const m = new capnp.Message().initRoot(TestAllTypes);

  m.boolField = true;
  m.int32Field = -42;
  m.float64Field = 1.25;
  m.textField = "prop";
  m.enumField = TestEnum.QUX;

  t.equal(m.getBoolField(), true);
  t.equal(m.int32Field, -42);
  t.equal(m.getFloat64Field(), 1.25);
  t.equal(m.textField, "prop");
  t.equal(m.enumField, TestEnum.QUX);

  t.end();
});

void tap.test("liberal setters: bigint, data, struct shapes, lists", (t) => {
  const m = new capnp.Message().initRoot(TestAllTypes);

  // Liberal string inputs accept whatever BigInt() accepts (note: negative hex is
  // not valid BigInt syntax; use decimal for negatives).
  m.int64Field = "-3735928559";
  t.equal(m.getInt64Field(), -0xdeadbeefn, "bigint property accepts strings");

  m.uInt64Field = 42;
  t.equal(m.uInt64Field, 42n, "bigint property accepts numbers");

  m.dataField = new Uint8Array([9, 8, 7]);
  t.same([...m.getDataField().toUint8Array()], [9, 8, 7], "data property accepts Uint8Array");

  m.dataField = "AQID";
  t.same([...m.dataField.toUint8Array()], [1, 2, 3], "data property accepts base64");

  m.structField = { textField: "shaped" };
  t.equal(m.getStructField().getTextField(), "shaped", "struct property accepts a shape");

  const other = new capnp.Message().initRoot(TestAllTypes);

  other.textField = "copied";
  m.structField = other;
  t.equal(m.structField.textField, "copied", "struct property accepts a struct (copy)");

  m.textList = ["x", "y"];
  t.same(m.getTextList().toArray(), ["x", "y"], "list property accepts an array");

  m.structList = [{ int32Field: 7 }];
  t.equal(m.structList.get(0).int32Field, 7, "struct list property accepts shapes");

  m.int64List = [1n, "2", 3];
  t.same(m.getInt64List().toArray(), [1n, 2n, 3n], "bigint list property accepts mixed encodings");

  t.end();
});

void tap.test("group and union properties", (t) => {
  const book = new capnp.Message().initRoot(AddressBook);

  book.people = [{ id: 1, name: "Carol", phones: [{ number: "555", type: Person_PhoneNumber_Type.WORK }] }];

  const carol = book.people.get(0);

  t.equal(carol.name, "Carol");
  t.equal(carol.phones.get(0).type, Person_PhoneNumber_Type.WORK);

  carol.employment = { employer: "ACME" };
  t.equal(carol.getEmployment().getEmployer(), "ACME", "group property accepts a shape");

  t.end();
});
