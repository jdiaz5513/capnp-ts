import { Message, ObjectSize, Orphan, Struct } from '../../../../lib';
import { Int32List } from '../../../../lib/serialization';
import { tap } from '../../../util';

/** Just a silly struct that holds a single pointer to... itself? */

class TestStruct extends Struct {

  static readonly _capnp = { displayName: 'TestStruct', id: 'f38ff832f33d57da', size: new ObjectSize(8, 2) };

  adoptTest(value: Orphan<TestStruct>): void {

    this._getPointer(0).adopt(value);

  }

  disownTest(): Orphan<TestStruct> {

    return this.getTest().disown();

  }

  getTest(): TestStruct {

    return this._getPointerAs(0, TestStruct);

  }

  hasTest(): boolean {

    return !this._getPointer(0)._isNull();

  }

  initTest(): TestStruct {

    return this._initStructAt(0, TestStruct);

  }

  setTest(value: TestStruct): void {

    this._getPointer(0)._copyFrom(value);

  }

  getFoo(): number {

    return this._getUint32(0);

  }

  setFoo(value: number): void {

    this._setUint32(0, value);

  }

  disownList(): Orphan<Int32List> {

    return this.getList().disown();

  }

  getList(): Int32List {

    return this._getPointerAs(1, Int32List);

  }

  initList(length: number): Int32List {

    return this._initList(1, Int32List, length);

  }

}

tap.test('new Orphan()', (t) => {

  const message = new Message();
  const root = message.initRoot(TestStruct);

  const structOrphan = new Orphan(root);

  if (structOrphan._capnp === undefined) throw new Error('orphan already adopted?');

  t.equal(
    structOrphan._capnp.size.dataByteLength, TestStruct._capnp.size.dataByteLength, 'should copy the data byte length');
  t.equal(
    structOrphan._capnp.size.pointerLength, TestStruct._capnp.size.pointerLength, 'should copy the pointer count');

  t.ok(root._isNull(), 'should zero out the struct pointer');

  const list = new Message().initRoot(TestStruct).initList(2);

  const listOrphan = new Orphan(list);

  if (listOrphan._capnp === undefined) throw new Error('orphan already adopted?');

  t.equal(listOrphan._capnp.length, 2, 'should copy the list length');
  t.equal(listOrphan._capnp.elementSize, Int32List._capnp.size, 'should copy the list element size');

  t.ok(list._isNull(), 'should zero out the list pointer');

  t.end();

});

tap.test('Orphan._moveTo()', (t) => {

  const root = new Message().initRoot(TestStruct);
  const oldChild = root.initTest();
  const oldList = root.initList(2);
  oldChild.setFoo(100);
  oldList.set(1, 300);

  const structOrphan = root.disownTest();
  const listOrphan = root.disownList();

  const newChild = root.initTest();
  const newList = root.initList(5);

  t.equal(newChild.getFoo(), 0, 'should not contain disowned struct data in new struct');
  t.equal(newList.get(1), 0, 'should not contain disowned list data in new list');

  newChild.setFoo(200);
  newList.set(1, 400);

  structOrphan._moveTo(newChild);
  listOrphan._moveTo(newList);

  t.equal(newChild.getFoo(), 100, 'should overwrite target struct pointer and keep old data');
  t.equal(newList.get(1), 300, 'should overwrite target list pointer and keep old data');
  t.equal(newList.getLength(), 2, 'should set the correct list length');

  t.throws(() => {

    structOrphan._moveTo(root.initTest());

  }, undefined, 'should not allow re-adoption');

  t.throws(() => {

    const o = root.disownTest();
    o._moveTo(new Message().initRoot(TestStruct));

  }, undefined, 'should not allow moving to a different message');

  t.end();

});

tap.test('Orphan.dispose()', (t) => {

  const root = new Message().initRoot(TestStruct);
  root.initTest().setFoo(100);
  root.initList(1).set(1, 200);

  const structOrphan = root.disownTest();
  const listOrphan = root.disownList();

  t.equal(root.segment.getUint32(32), 100);
  t.equal(root.segment.getInt32(60), 200);

  structOrphan.dispose();

  t.equal(root.segment.getUint32(32), 0);

  listOrphan.dispose();

  t.equal(root.segment.getInt32(60), 0);

  t.end();

});
