/**
 * @author jdiaz5513
 */

import * as capnp from '../../lib';
import {compareBuffers, readFileBuffer, tap} from '../util';
import {AddressBook, Person} from './serialization-demo';

const EXPECTED_OUT = readFileBuffer('test/data/serialization-demo.bin');

tap.test('write address book', (t) => {

  const message = new capnp.Message();
  const addressBook = message.initRoot(AddressBook);

  t.type(addressBook, AddressBook);

  const people = addressBook.initPeople(2);

  t.type(people, capnp.CompositeList);

  const alice = people.get(0);

  t.type(alice, Person);

  alice.setId(456);
  alice.setName('Alice');
  alice.setEmail('alice@example.com');

  t.comment('should not crash while calling setters');

  const alicePhones = alice.initPhones(1);

  t.type(alicePhones, capnp.CompositeList);

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

  t.type(bobPhones, capnp.CompositeList);

  bobPhones.get(0).setNumber('555-4567');
  bobPhones.get(0).setType(Person.PhoneNumber.Type.HOME);
  bobPhones.get(1).setNumber('555-7654');
  bobPhones.get(1).setType(Person.PhoneNumber.Type.WORK);

  t.comment('should not crash while chaining getters');

  bob.getEmployment().setUnemployed();

  t.comment('should not crash while setting void union');

  const out = message.writeToArrayBuffer();

  compareBuffers(t, out, EXPECTED_OUT);

  t.end();

});
