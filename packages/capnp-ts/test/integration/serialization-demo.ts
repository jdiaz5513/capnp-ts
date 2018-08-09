/**
 * This file was **not** generated automatically. Historically it served as a template for the code generator.
 *
 * Notable differences from actual generated files are in comments below.
 *
 * @author jdiaz5513
 */

/* tslint:disable:no-use-before-declare max-classes-per-file */

// Note that this is a relative import; in an autogenerated file this would be `import * as capnp from 'capnp-ts';`.
import * as capnp from "../../lib";
// ObjectSize must be brought into this file's scope, otherwise its type would not be usable. Struct is also brought in
// to keep the generate file size down (it's referenced a LOT!).
import { ObjectSize as __O, Struct as __S } from "../../lib";

export const _id = "b597bf4897e54f89";

export class AddressBook extends __S {
  static _capnp = { displayName: "AddressBook", id: "", size: new __O(0, 1) };
  static People: capnp.ListCtor<Person>;

  adoptPeople(value: capnp.Orphan<capnp.List<Person>>): void {
    // There is no extra overhead to proxy through to the Pointer static methods via Struct like this since the original
    // function reference is copied as a static property.
    __S.adopt(value, __S.getPointer(0, this));
  }

  disownPeople(): capnp.Orphan<capnp.List<Person>> {
    return __S.disown(this.getPeople());
  }

  getPeople(): capnp.List<Person> {
    return __S.getList(0, AddressBook.People, this);
  }

  hasPeople(): boolean {
    return !__S.isNull(__S.getPointer(0, this));
  }

  initPeople(length: number): capnp.List<Person> {
    return __S.initList(0, AddressBook.People, length, this);
  }

  setPeople(value: capnp.List<Person>): void {
    __S.copyFrom(value, __S.getPointer(0, this));
  }

  toString() {
    return `AddressBook_${super.toString()}`;
  }
}

declare namespace Person_PhoneNumber_Type {
  export const _displayName = "Type";
  export const _id = "98bef1051277b9df";
}

enum Person_PhoneNumber_Type {
  MOBILE = 0,
  HOME = 1,
  WORK = 2
}

class Person_Employment extends __S {
  static readonly _capnp = {
    displayName: "Employment",
    id: "927f49708287c3b6",
    size: new __O(8, 4)
  };
  static UNEMPLOYED = 0;
  static EMPLOYER = 1;
  static SCHOOL = 2;
  static SELF_EMPLOYED = 3;

  _initGroup = () => {
    __S.setUint16(4, 0, this);
  };

  getEmployer(): string {
    __S.testWhich("employment", this.which(), 1, this);

    return __S.getText(3, this);
  }

  getSchool(): string {
    __S.testWhich("employment", this.which(), 2, this);

    return __S.getText(3, this);
  }

  isEmployer(): boolean {
    return this.which() === 1;
  }

  isSchool(): boolean {
    return this.which() === 2;
  }

  isSelfEmployed(): boolean {
    return this.which() === 3;
  }

  isUnemployed(): boolean {
    return this.which() === 0;
  }

  hasEmployer(): boolean {
    __S.testWhich("employment", this.which(), 1, this);

    return !__S.isNull(__S.getPointer(3, this));
  }

  hasSchool(): boolean {
    __S.testWhich("employment", this.which(), 2, this);

    return !__S.isNull(__S.getPointer(3, this));
  }

  setEmployer(value: string): void {
    __S.setUint16(4, 1, this);
    __S.setText(3, value, this);
  }

  setSchool(value: string): void {
    __S.setUint16(4, 2, this);
    __S.setText(3, value, this);
  }

  setSelfEmployed(): void {
    __S.setUint16(4, 3, this);
  }

  setUnemployed(): void {
    __S.setUint16(4, 0, this);
  }

  toString(): string {
    return `Person_Employment_${super.toString()}`;
  }

  which(): number {
    return __S.getUint16(4, this);
  }
}

class Person_PhoneNumber extends __S {
  static readonly _capnp = {
    displayName: "PhoneNumber",
    id: "cba8ed6b45001ccc",
    size: new __O(2, 1)
  };
  static readonly Type = Person_PhoneNumber_Type;

  getNumber(): string {
    return __S.getText(0, this);
  }

  getType(): Person_PhoneNumber_Type {
    return __S.getUint16(0, this);
  }

  setNumber(value: string): void {
    __S.setText(0, value, this);
  }

  setType(value: Person_PhoneNumber_Type): void {
    __S.setUint16(0, value, this);
  }

  toString(): string {
    return `Person_PhoneNumber_${super.toString()}`;
  }
}

export class Person extends __S {
  static readonly _capnp = {
    displayName: "Person",
    id: "efbbc4e996f07104",
    size: new __O(8, 4)
  };
  static readonly Employment = Person_Employment;
  static readonly PhoneNumber = Person_PhoneNumber;
  static Phones: capnp.ListCtor<Person_PhoneNumber>;

  adoptPhones(value: capnp.Orphan<capnp.List<Person_PhoneNumber>>): void {
    __S.adopt(value, __S.getPointer(2, this));
  }

  disownPhones(): capnp.Orphan<capnp.List<Person_PhoneNumber>> {
    return __S.disown(this.getPhones());
  }

  getEmail(): string {
    return __S.getText(1, this);
  }

  getEmployment(): Person_Employment {
    return __S.getAs(Person_Employment, this);
  }

  getId(): number {
    return __S.getUint32(0, this);
  }

  getName(): string {
    return __S.getText(0, this);
  }

  getPhones(): capnp.List<Person_PhoneNumber> {
    return __S.getList(2, Person.Phones, this);
  }

  hasEmail(): boolean {
    return !__S.isNull(__S.getPointer(1, this));
  }

  hasName(): boolean {
    return !__S.isNull(__S.getPointer(0, this));
  }

  hasPhones(): boolean {
    return !__S.isNull(__S.getPointer(2, this));
  }

  initEmployment(): Person_Employment {
    const e = this.getEmployment();
    e._initGroup();
    return e;
  }

  initPhones(length: number): capnp.List<Person_PhoneNumber> {
    return __S.initList(2, Person.Phones, length, this);
  }

  setEmail(value: string): void {
    __S.setText(1, value, this);
  }

  setId(value: number): void {
    __S.setUint32(0, value, this);
  }

  setName(value: string): void {
    __S.setText(0, value, this);
  }

  setPhones(value: capnp.List<Person_PhoneNumber>): void {
    __S.copyFrom(value, __S.getPointer(2, this));
  }

  toString(): string {
    return `Person_${super.toString()}`;
  }
}

AddressBook.People = capnp.CompositeList(Person);
Person.Phones = capnp.CompositeList(Person_PhoneNumber);
