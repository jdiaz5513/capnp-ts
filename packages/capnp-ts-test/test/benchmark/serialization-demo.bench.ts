/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */

import { Suite } from "benchmark";
import { readFileSync } from "fs";
import * as path from "path";

import * as capnp from "capnp-ts";
import { decodeUtf8 } from "capnp-ts/src/util";
import { AddressBook } from "../integration/serialization-demo";
import { logBench, readFileBuffer } from "../util";

const jsonBuffer = new Uint8Array(readFileBuffer("test/data/serialization-demo.json"));
const jsonString = readFileSync(path.join(__dirname, "../../", "test/data/serialization-demo.json"), "utf-8");
const messageData = readFileBuffer("test/data/serialization-demo.bin");
// Let's preprocess it so we have just the raw segment data.
const messageSegment = new capnp.Message(messageData).getSegment(0).buffer;

const deeplyNested = new Suite("iteration over deeply nested lists")

  .add("JSON.parse(decodeUtf8(m))", () => {
    const addressBook = JSON.parse(decodeUtf8(jsonBuffer));

    addressBook.people.forEach((person: { phones: [] }) => {
      person.phones.forEach((phone: { number: string }) => {
        phone.number.toUpperCase();
      });
    });
  })

  .add("JSON.parse(m)", () => {
    const addressBook = JSON.parse(jsonString);

    addressBook.people.forEach((person: { phones: [] }) => {
      person.phones.forEach((phone: { number: string }) => {
        phone.number.toUpperCase();
      });
    });
  })

  .add("capnp.Message(m)", () => {
    const message = new capnp.Message(messageSegment, false, true);

    const addressBook = message.getRoot(AddressBook);

    addressBook.getPeople().forEach((person) => {
      person.getPhones().forEach((phone) => {
        phone.getNumber().toUpperCase();
      });
    });
  });

const listLength = new Suite("top level list length access")

  .add("JSON.parse(decodeUtf8(m))", () => {
    const addressBook = JSON.parse(decodeUtf8(jsonBuffer));

    addressBook.people.length.toFixed(0);
  })

  .add("JSON.parse(m)", () => {
    const addressBook = JSON.parse(jsonString);

    addressBook.people.length.toFixed(0);
  })

  .add("capnp.Message(m)", () => {
    const message = new capnp.Message(messageSegment, false, true);

    const addressBook = message.getRoot(AddressBook);

    addressBook.getPeople().getLength().toFixed(0);
  });

const parse = new Suite('"parse"')

  .add("JSON.parse(decodeUtf8(m))", () => {
    JSON.parse(decodeUtf8(jsonBuffer));
  })

  .add("JSON.parse(m)", () => {
    JSON.parse(jsonString);
  })

  .add("capnp.Message(m).getRoot(A)", () => {
    // Okay, this isn't fair. Cap'n Proto only does "parsing" at access time. :)

    new capnp.Message(messageSegment, false, true).getRoot(AddressBook);
  });

logBench(deeplyNested).run();
logBench(listLength).run();
logBench(parse).run();
