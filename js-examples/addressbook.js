// Ported from the C++ version at:
// https://github.com/capnproto/capnproto/blob/db268884b372989bac511b2eff737d1b6ce4423c/c%2B%2B/samples/addressbook.c%2B%2B

// Copyright (c) 2013-2014 Sandstorm Development Group, Inc. and contributors
// Licensed under the MIT License:
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
// THE SOFTWARE.

const capnp = require('capnp-ts');
const {
  AddressBook,
  Person,
  Person_Employment,
  Person_PhoneNumber,
  Person_PhoneNumber_Type
} = require('./addressbook.capnp.js');

function writePackedMessageToStream(writeStream, message) {
  const arrayBuffer = message.toPackedArrayBuffer();
  // Beacause streams can't handle ArrayBuffers
  const buffer = new Buffer(arrayBuffer);
  writeStream.write(buffer);
}

function writeAddressBook(writeStream) {
  const message = new capnp.Message();
  const addressBook = message.initRoot(AddressBook);
  const people = addressBook.initPeople(2);

  const alice = people.get(0);
  alice.setId(123);
  alice.setName("Alice");
  alice.setEmail("alice@example.com");
  const alicePhones = alice.initPhones(1);
  alicePhones.get(0).setNumber("555-1212");
  alicePhones.get(0).setType(Person_PhoneNumber_Type.MOBILE);
  alice.getEmployment().setSchool("MIT");

  const bob = people.get(1);
  bob.setId(456);
  bob.setName("Bob");
  bob.setEmail("bob@example.com");
  const bobPhones = bob.initPhones(2);
  bobPhones.get(0).setNumber("555-4567");
  bobPhones.get(0).setType(Person_PhoneNumber_Type.HOME);
  bobPhones.get(1).setNumber("555-7654");
  bobPhones.get(1).setType(Person_PhoneNumber_Type.WORK);
  bob.getEmployment().setUnemployed();

  writePackedMessageToStream(writeStream, message);
}

function readToEndOfStream(readStream) {
  return new Promise(function(resolve, reject) {
    let result = new Uint8Array();
    readStream.on('data', function(data) {
      const oldLen = result.byteLength;
      const newResult = new Uint8Array(oldLen + data.byteLength);
      newResult.set(result);
      newResult.set(data, oldLen);
      result = newResult;
    });
    readStream.on('end', function() {
      resolve(result);
    });
    readStream.on('error', reject);
  });
}

function printAddressBook(readStream) {
  return readToEndOfStream(readStream).then(function(data) {
    const message = capnp.Message.fromPackedArrayBuffer(data);
    const addressBook = message.getRoot(AddressBook);
    addressBook.getPeople().forEach(function(person) {
      console.log(person.getName() + ': ' + person.getEmail());
      person.getPhones().forEach(function(phone) {
        let phoneTypeString = Person_PhoneNumber_Type[phone.getType()];
        console.log('  ' + phoneTypeString + ' phone: ' + phone.getNumber());
      });
      const employment = person.getEmployment();
      switch (employment.which()) {
        case Person_Employment.UNEMPLOYED:
          console.log('  unemployed');
          break;
        case Person_Employment.EMPLOYER:
          console.log('  employer: ' + employment.getEmployer());
          break;
        case Person_Employment.SCHOOL:
          console.log('  student at: ' + employment.getSchool());
          break;
        case Person_Employment.SELF_EMPLOYED:
          console.log('  self-employed');
          break;
      }
    });
  });
}

function main() {
  // TODO Not sure if we have dynamic schema usage available yet
  // StructSchema schema = Schema::from<AddressBook>();
  if (process.argv.length != 3) {
    throw new Error('Missing arg.');
  } else if (process.argv[2] == 'write') {
    return writeAddressBook(process.stdout);
  } else if (process.argv[2] == 'read') {
    return printAddressBook(process.stdin);
  } else if (process.argv[2] == 'dwrite') {
    console.error('Unimplemented');
    // return dynamicWriteAddressBook(1, schema);
  } else if (process.argv[2] == 'dread') {
    console.error('Unimplemented');
    // return dynamicPrintMessage(0, schema);
  } else {
    throw new Error('Invalid arg: ' + process.argv[2]);
  }
}

if (require && require.main === module) {
  Promise.resolve(main()).then(function(exitCode) {
    process.exit(exitCode);
  }).catch(function(error) {
    console.error(error);
    process.exit(1);
  });
}
