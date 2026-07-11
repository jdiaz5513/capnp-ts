import tap from "tap";

import * as capnp from "capnp-ts";

import { AddressBook, Person_Employment, Person_PhoneNumber_Type } from "./serialization-demo.capnp.js";
import { TestAllTypes, TestEnum } from "./test.capnp.js";

void tap.test("set() assigns a plain object shape", (t) => {
  const book = new capnp.Message().initRoot(AddressBook);

  book.set({
    people: [
      {
        email: "alice@example.com",
        employment: { school: "MIT" },
        id: 123,
        name: "Alice",
        phones: [{ number: "555-1212", type: Person_PhoneNumber_Type.MOBILE }],
      },
      {
        employment: { unemployed: null },
        id: 456,
        name: "Bob",
      },
    ],
  });

  const people = book.getPeople();

  t.equal(people.getLength(), 2);

  const alice = people.get(0);

  t.equal(alice.getId(), 123);
  t.equal(alice.getName(), "Alice");
  t.equal(alice.getEmail(), "alice@example.com");
  t.equal(alice.getPhones().get(0).getNumber(), "555-1212");
  t.equal(alice.getPhones().get(0).getType(), Person_PhoneNumber_Type.MOBILE);
  t.equal(alice.getEmployment().which(), Person_Employment.SCHOOL);
  t.equal(alice.getEmployment().getSchool(), "MIT");

  const bob = people.get(1);

  t.equal(bob.getId(), 456);
  t.equal(bob.getEmployment().which(), Person_Employment.UNEMPLOYED);

  t.end();
});

void tap.test("get()/toJSON() round-trips through set()", (t) => {
  const m = new capnp.Message().initRoot(TestAllTypes);

  m.set({
    boolField: true,
    dataField: new Uint8Array([1, 2, 3, 255]),
    enumField: TestEnum.GARPLY,
    float64Field: 1.5,
    int32Field: -123456,
    int64Field: -1234567890123456789n,
    int64List: [1n, "-2", 3],
    structField: { textField: "nested" },
    structList: [{ int32Field: 1 }, { int32Field: 2 }],
    textField: "hello",
    textList: ["a", "b"],
    uInt64Field: "0xffffffffffffffff",
  });

  t.equal(m.getInt64Field(), -1234567890123456789n, "bigint set from bigint");
  t.equal(m.getUInt64Field(), 0xffffffffffffffffn, "bigint set from hex string");
  t.equal(m.getInt64List().get(1), -2n, "bigint list accepts strings");

  const json = m.get();

  t.equal(json.int64Field, "-1234567890123456789", "bigint emits string");
  t.equal(json.dataField, "AQID/w==", "data emits base64");
  t.same(json.int64List, ["1", "-2", "3"]);
  t.equal(json.structField?.textField, "nested");
  t.equal(json.structList?.length, 2);

  // The round trip: assigning get() output to a fresh struct yields identical JSON.
  const m2 = new capnp.Message().initRoot(TestAllTypes);

  m2.set(json);
  t.same(m2.get(), json, "set(get()) round-trips");

  // toJSON() is picked up by JSON.stringify via protocol.
  t.equal(JSON.parse(JSON.stringify(m)).textField, "hello");

  t.end();
});

void tap.test("set() accepts base64 for data fields", (t) => {
  const m = new capnp.Message().initRoot(TestAllTypes);

  m.set({ dataField: "AQID/w==" });
  t.same([...m.getDataField().toUint8Array()], [1, 2, 3, 255]);

  t.end();
});

void tap.test("base64 helpers round-trip odd lengths", (t) => {
  for (const len of [0, 1, 2, 3, 4, 5, 31]) {
    const bytes = new Uint8Array(len).map((_, i) => (i * 37) % 256);
    const encoded = capnp.bytesToBase64(bytes);

    t.same([...capnp.base64ToBytes(encoded)], [...bytes], `length ${len}`);
  }

  t.end();
});
