/**
 * This file was **not** generated automatically. Historically it served as a template for the code generator.
 *
 * Notable differences from actual generated files are in comments below.
 *
 * @author jdiaz5513
 */

/* tslint:disable:no-use-before-declare max-classes-per-file */

// Note that this is a relative import; in an autogenerated file this would be `import * as capnp from 'capnp-ts';`.
import * as capnp from '../../lib';
// ObjectSize is the only other var brought into this file's scope, otherwise its type would not be usable.
import { ObjectSize } from '../../lib';

export const _id = 'b597bf4897e54f89';

export class AddressBook extends capnp.Struct {

  static _capnp = { displayName: 'AddressBook', id: '', size: new ObjectSize(0, 1) };
  static People: capnp.ListCtor<Person>;

  adoptPeople(value: capnp.Orphan<capnp.List<Person>>): void {

    this._getPointer(0).adopt(value);

  }

  disownPeople(): capnp.Orphan<capnp.List<Person>> {

    return this.getPeople().disown();

  }

  getPeople(): capnp.List<Person> {

    return this._getList(0, AddressBook.People);

  }

  hasPeople(): boolean {

    return !this._getPointer(0)._isNull();

  }

  initPeople(length: number): capnp.List<Person> {

    return this._initList(0, AddressBook.People, length);

  }

  setPeople(value: capnp.List<Person>): void {

    this._getPointer(0)._copyFrom(value);

  }

  toString() {

    return `AddressBook_${super.toString()}`;

  }

}

declare namespace Person_PhoneNumber_Type {

  export const _displayName = 'Type';
  export const _id = '98bef1051277b9df';

}

enum Person_PhoneNumber_Type {
  MOBILE = 0,
  HOME = 1,
  WORK = 2,
}

class Person_Employment extends capnp.Struct {

  static readonly _capnp = { displayName: 'Employment', id: '927f49708287c3b6', size: new ObjectSize(8, 4) };
  static UNEMPLOYED = 0;
  static EMPLOYER = 1;
  static SCHOOL = 2;
  static SELF_EMPLOYED = 3;

  _initGroup = () => {

    this._setUint16(4, 0);

  }

  getEmployer(): string {

    this._testWhich('employment', this.which(), 1);

    return this._getText(3);

  }

  getSchool(): string {

    this._testWhich('employment', this.which(), 2);

    return this._getText(3);

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

    this._testWhich('employment', this.which(), 1);

    return !this._getPointer(3)._isNull();

  }

  hasSchool(): boolean {

    this._testWhich('employment', this.which(), 2);

    return !this._getPointer(3)._isNull();

  }

  setEmployer(value: string): void {

    this._setUint16(4, 1);
    this._setText(3, value);

  }

  setSchool(value: string): void {

    this._setUint16(4, 2);
    this._setText(3, value);

  }

  setSelfEmployed(): void {

    this._setUint16(4, 3);

  }

  setUnemployed(): void {

    this._setUint16(4, 0);

  }

  toString(): string {

    return `Person_Employment_${super.toString()}`;

  }

  which(): number {

    return this._getUint16(4);

  }

}

class Person_PhoneNumber extends capnp.Struct {

  static readonly _capnp = { displayName: 'PhoneNumber', id: 'cba8ed6b45001ccc', size: new ObjectSize(2, 1) };
  static readonly Type = Person_PhoneNumber_Type;

  getNumber(): string {

    return this._getText(0);

  }

  getType(): Person_PhoneNumber_Type {

    return this._getUint16(0);

  }

  setNumber(value: string): void {

    this._setText(0, value);

  }

  setType(value: Person_PhoneNumber_Type): void {

    this._setUint16(0, value);

  }

  toString(): string {

    return `Person_PhoneNumber_${super.toString()}`;

  }

}

export class Person extends capnp.Struct {

  static readonly _capnp = { displayName: 'Person', id: 'efbbc4e996f07104', size: new ObjectSize(8, 4) };
  static readonly Employment = Person_Employment;
  static readonly PhoneNumber = Person_PhoneNumber;
  static Phones: capnp.ListCtor<Person_PhoneNumber>;

  adoptPhones(value: capnp.Orphan<capnp.List<Person_PhoneNumber>>): void {

    this._getPointer(2).adopt(value);

  }

  disownPhones(): capnp.Orphan<capnp.List<Person_PhoneNumber>> {

    return this.getPhones().disown();

  }

  getEmail(): string {

    return this._getText(1);

  }

  getEmployment(): Person_Employment {

    return this._getAs(Person_Employment);

  }

  getId(): number {

    return this._getUint32(0);

  }

  getName(): string {

    return this._getText(0);

  }

  getPhones(): capnp.List<Person_PhoneNumber> {

    return this._getList(2, Person.Phones);

  }

  hasEmail(): boolean {

    return !this._getPointer(1)._isNull();

  }

  hasName(): boolean {

    return !this._getPointer(0)._isNull();

  }

  hasPhones(): boolean {

    return !this._getPointer(2)._isNull();

  }

  initEmployment(): Person_Employment {

    const e = this.getEmployment();
    e._initGroup();
    return e;

  }

  initPhones(length: number): capnp.List<Person_PhoneNumber> {

    return this._initList(2, Person.Phones, length);

  }

  setEmail(value: string): void {

    this._setText(1, value);

  }

  setId(value: number): void {

    this._setUint32(0, value);

  }

  setName(value: string): void {

    this._setText(0, value);

  }

  setPhones(value: capnp.List<Person_PhoneNumber>): void {

    this._getPointer(2)._copyFrom(value);

  }

  toString(): string {

    return `Person_${super.toString()}`;

  }

}

AddressBook.People = capnp.CompositeList(Person);
Person.Phones = capnp.CompositeList(Person_PhoneNumber);
