import tap from "tap";
import * as capnp from "capnp-ts";
import { Calculator } from "./rpc/calculator.capnp.js";
import { Person } from "./serialization-demo.capnp.js";

// The type annotations here are the test: every dotted name must resolve in type position as well as value position.

void tap.test("namespace aliases for nested declarations", (t) => {
  const person: Person = new capnp.Message().initRoot(Person);

  const phone: Person.PhoneNumber = person.initPhones(1).get(0);
  phone.setType(Person.PhoneNumber.Type.MOBILE);
  t.equal(phone.getType(), Person.PhoneNumber.Type.MOBILE);

  const employment: Person.Employment = person.getEmployment();
  t.equal(employment.which(), Person.Employment.Which.UNEMPLOYED);

  const shape: Person.Shape = { name: "ns" };
  person.set(shape);
  const json: Person.Json = person.toJSON();
  t.equal(json.name, "ns");

  const client: Calculator.Client | undefined = undefined;
  t.equal(client, undefined);
  t.equal(typeof Calculator.Client, "function");
  t.equal(typeof Calculator.Server, "function");
  t.equal(typeof Calculator.Function.Client, "function");

  t.end();
});
