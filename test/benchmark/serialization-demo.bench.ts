import {Suite} from 'benchmark';
import {readFileSync} from 'fs';

import * as capnp from '../../lib';
import {decodeUtf8, encodeUtf8, pad} from '../../lib/util';
import {AddressBook} from '../integration/serialization-demo';
import {logBench, readFileBuffer} from '../util';

const jsonBuffer = readFileBuffer('test/data/serialization-demo.json');
const jsonString = readFileSync('test/data/serialization-demo.json', 'utf-8');
const messageData = readFileBuffer('test/data/serialization-demo.bin');
// Let's preprocess it so we have just the raw segment data.
const messageSegment = capnp.Message.getFramedSegments(messageData)[0];
const messageString = decodeUtf8(new Uint8Array(messageSegment));

function noop(x: any): void {}

const deeplyNested = new Suite('iteration over deeply nested lists')

  .add('JSON', () => {

    const addressBook = JSON.parse(jsonString);

    addressBook.people.forEach((person) => {

      person.phones.forEach((phone) => {

        phone.number.toUpperCase();

      });

    });

  })

  .add('capnp.Message', () => {

    const message = new capnp.Message(messageSegment);

    const addressBook = message.getRoot(AddressBook);

    addressBook.getPeople().forEach((person) => {

      person.getPhones().forEach((phone) => {

        phone.getNumber().toUpperCase();

      });

    });

  });

const listLength = new Suite('top level list length access')

  .add('JSON', () => {

    const addressBook = JSON.parse(jsonString);

    addressBook.people.length.toFixed(0);

  })

  .add('capnp.Message', () => {

    const message = new capnp.Message(messageSegment);

    const addressBook = message.getRoot(AddressBook);

    addressBook.getPeople().getLength().toFixed(0);

  });

const parse = new Suite('parse')

  .add('JSON', () => {

    JSON.parse(jsonString);

  })

  .add('capnp.Message', () => {

    // Okay, this isn't fair. Cap'n Proto only does "parsing" at access time. :)

    new capnp.Message(messageSegment).getRoot(AddressBook);

  });

logBench(deeplyNested).run();
logBench(listLength).run();
logBench(parse).run();
