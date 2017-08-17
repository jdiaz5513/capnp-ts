/**
 * @author jdiaz5513
 */

import * as capnp from '../../lib';
import {compareBuffers, readFileBuffer, tap} from '../util';
import {AddressBook, Person} from './serialization-demo';

const SERIALIZATION_DEMO = readFileBuffer('test/data/serialization-demo.bin');

tap.test('write address book', (t) => {

  const message = new capnp.Message();
  const addressBook = message.initRoot(AddressBook);

  t.type(addressBook, AddressBook);

  const people = addressBook.initPeople(2);

  t.type(people, AddressBook._People);

  const alice = people.get(0);

  t.type(alice, Person);

  alice.setId(456);
  alice.setName('Alice');
  alice.setEmail('alice@example.com');

  t.comment('should not crash while calling setters');

  const alicePhones = alice.initPhones(1);

  t.type(alicePhones, Person._Phones);

  alicePhones.get(0).setNumber('555-1212');
  alicePhones.get(0).setType(Person.PhoneNumber.Type.MOBILE);

  t.comment('should not crash while chaining getter calls');

  alice.getEmployment().setSchool('MIT');

  t.comment('should not crash while accessing groups and unions');

  const bob = people.get(1);

  t.type(bob, Person);

  bob.setId(456);
  bob.setName('Bob');
  bob.setEmail('bob@example.com');

  t.comment('should not crash while calling setters on composite struct with nonzero index');

  const bobPhones = bob.initPhones(2);

  t.type(bobPhones, Person._Phones);

  bobPhones.get(0).setNumber('555-4567');
  bobPhones.get(0).setType(Person.PhoneNumber.Type.HOME);
  bobPhones.get(1).setNumber('555-7654');
  bobPhones.get(1).setType(Person.PhoneNumber.Type.WORK);

  t.comment('should not crash while chaining getters');

  bob.getEmployment().setUnemployed();

  t.comment('should not crash while setting void union');

  const out = message.toArrayBuffer();

  compareBuffers(t, out, SERIALIZATION_DEMO);

  t.end();

});

tap.test('read address book', (t) => {

  // Normally this is silly, but we're sure that this .bin file only contains a single segment.

  const message = capnp.Message.fromSegmentBuffer(capnp.Message.getFramedSegments(SERIALIZATION_DEMO)[0]);

  const addressBook = message.getRoot(AddressBook);

  const people = addressBook.getPeople();

  t.equal(people.getLength(), 2);

  const alice = people.get(0);

  t.equal(alice.getId(), 456);
  t.equal(alice.getName(), 'Alice');
  t.equal(alice.getEmail(), 'alice@example.com');

  const alicePhones = alice.getPhones();

  t.equal(alicePhones.getLength(), 1);

  t.equal(alicePhones.get(0).getNumber(), '555-1212');
  t.equal(alicePhones.get(0).getType(), Person.PhoneNumber.Type.MOBILE);

  const aliceEmployment = alice.getEmployment();

  t.equal(aliceEmployment.which(), Person.Employment.SCHOOL);
  t.ok(aliceEmployment.isSchool());
  t.equal(aliceEmployment.getSchool(), 'MIT');

  const bob = people.get(1);

  t.equal(bob.getId(), 456);
  t.equal(bob.getName(), 'Bob');
  t.equal(bob.getEmail(), 'bob@example.com');

  const bobPhones = bob.getPhones();

  t.equal(bobPhones.getLength(), 2);

  t.equal(bobPhones.get(0).getNumber(), '555-4567');
  t.equal(bobPhones.get(0).getType(), Person.PhoneNumber.Type.HOME);
  t.equal(bobPhones.get(1).getNumber(), '555-7654');
  t.equal(bobPhones.get(1).getType(), Person.PhoneNumber.Type.WORK);

  const bobEmployment = bob.getEmployment();

  t.equal(bobEmployment.which(), Person.Employment.UNEMPLOYED);
  t.ok(bobEmployment.isUnemployed());

  t.end();

});

tap.test('copy pointers from other message', (t) => {

  const message1 = new capnp.Message();
  const addressBook1 = message1.initRoot(AddressBook);
  const people1 = addressBook1.initPeople(2);
  const alice1 = people1.get(1);

  alice1.setName('Alice');
  alice1.setEmail('alice@example.com');
  alice1.setId(456);

  const message2 = new capnp.Message();
  const addressBook2 = message2.initRoot(AddressBook);

  addressBook2.setPeople(people1);

  const people2 = addressBook2.getPeople();
  const alice2 = people2.get(1);

  t.equal(people2.getLength(), 2);
  t.equal(alice2.getName(), 'Alice');
  t.equal(alice2.getEmail(), 'alice@example.com');
  t.equal(alice2.getId(), 456);

  t.end();

});

tap.test('adoption', (t) => {

  const m = new capnp.Message();
  const s = m.getSegment(0);
  const addressBook = m.initRoot(AddressBook);
  const people1 = addressBook.initPeople(1);
  const alice1 = people1.get(0);

  alice1.setName('Alice');
  alice1.setEmail('alice@example.com');
  alice1.setId(456);

  const o = addressBook.disownPeople();

  t.ok(s.isWordZero(0x08), 'should null the pointer');
  t.notOk(s.isWordZero(0x10), 'should not wipe out the composite list tag word');
  t.notOk(s.isWordZero(0x40), 'should not touch the content');
  t.ok(people1._isNull(), 'should null the original pointer');

  addressBook.adoptPeople(o);

  const people2 = addressBook.getPeople();
  const alice2 = people2.get(0);

  t.equal(alice2.getName(), 'Alice');
  t.equal(alice2.getEmail(), 'alice@example.com');
  t.equal(alice2.getId(), 456);
  t.equal(alice1.getId(), 456);

  t.throws(() => addressBook.adoptPeople(o), undefined, 'should not allow multiple adoption');

  t.end();

});

tap.test('overwrite', (t) => {

  const m = new capnp.Message();
  const s = m.getSegment(0);
  const addressBook = m.initRoot(AddressBook);
  const alice = addressBook.initPeople(1).get(0);

  alice.setName('Alex');
  alice.setName('Alice');

  t.ok(s.isWordZero(0x40), 'should zero out the old string');

  addressBook.initPeople(1);

  t.ok(s.isWordZero(0x40), 'should zero out every string');
  t.ok(s.isWordZero(0x48), 'should zero out every string');

  t.end();

});
