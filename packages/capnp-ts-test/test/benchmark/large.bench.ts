/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */

import { Suite } from "benchmark";

import * as capnp from "capnp-ts";
import { AddressBook } from "../integration/serialization-demo";
import { logBench } from "../util";

const N_PEOPLE = 1000;
const N_PHONES = 3;

// Build a capnp message with N_PEOPLE people, each with N_PHONES phones.
const buildMsg = new capnp.Message();
const book = buildMsg.initRoot(AddressBook);
const people = book.initPeople(N_PEOPLE);
for (let i = 0; i < N_PEOPLE; i++) {
  const p = people.get(i);
  p.setId(i);
  p.setName(`Person ${i}`);
  p.setEmail(`person${i}@example.com`);
  const phones = p.initPhones(N_PHONES);
  for (let j = 0; j < N_PHONES; j++) {
    phones.get(j).setNumber(`555-010${j}`);
  }
}

const seg = buildMsg.getSegment(0);
const capnpBuf = seg.buffer.slice(0, seg.byteLength);

// Build equivalent JSON.
const jsonStr = JSON.stringify({
  people: Array.from({ length: N_PEOPLE }, (_, i) => ({
    id: i,
    name: `Person ${i}`,
    email: `person${i}@example.com`,
    phones: Array.from({ length: N_PHONES }, (_, j) => ({
      number: `555-010${j}`,
    })),
  })),
});

// eslint-disable-next-line no-console
console.log(`\nDataset: ${N_PEOPLE} people x ${N_PHONES} phones each`);
// eslint-disable-next-line no-console
console.log(`  capnp: ${capnpBuf.byteLength} bytes, JSON: ${Buffer.byteLength(jsonStr)} bytes`);

// --- Benchmark 1: Parse only (no field access) ---

const parseOnly = new Suite(`parse only (${N_PEOPLE} people)`)
  .add("JSON.parse", () => {
    JSON.parse(jsonStr);
  })
  .add("capnp.Message (lazy)", () => {
    new capnp.Message(capnpBuf, false, true);
  });

// --- Benchmark 2: Selective access (get one person's name from the middle) ---

const selective = new Suite(`selective access (person #${N_PEOPLE >> 1} name only)`)
  .add("JSON.parse + access", () => {
    const ab = JSON.parse(jsonStr);
    ab.people[N_PEOPLE >> 1].name;
  })
  .add("capnp.Message + access", () => {
    const m = new capnp.Message(capnpBuf, false, true);
    m.getRoot(AddressBook).getPeople().get(N_PEOPLE >> 1).getName();
  });

// --- Benchmark 3: List length only ---

const lengthOnly = new Suite(`list length only (${N_PEOPLE} people)`)
  .add("JSON.parse + .length", () => {
    JSON.parse(jsonStr).people.length;
  })
  .add("capnp.Message + getLength()", () => {
    new capnp.Message(capnpBuf, false, true).getRoot(AddressBook).getPeople().getLength();
  });

// --- Benchmark 4: Full traversal (every person, every phone) ---

const fullTraversal = new Suite(`full traversal (${N_PEOPLE * N_PHONES} phone records)`)
  .add("JSON.parse + traverse", () => {
    const ab = JSON.parse(jsonStr);
    for (const person of ab.people) {
      for (const phone of person.phones) {
        phone.number.toUpperCase();
      }
    }
  })
  .add("capnp.Message + traverse", () => {
    const m = new capnp.Message(capnpBuf, false, true);
    const ab = m.getRoot(AddressBook);
    const ps = ab.getPeople();
    const n = ps.getLength();
    for (let i = 0; i < n; i++) {
      const person = ps.get(i);
      const phones = person.getPhones();
      const m2 = phones.getLength();
      for (let j = 0; j < m2; j++) {
        phones.get(j).getNumber().toUpperCase();
      }
    }
  });

logBench(parseOnly).run();
logBench(selective).run();
logBench(lengthOnly).run();
logBench(fullTraversal).run();
