/**
 * A collection of tests for various list pointer behaviors, especially around handling of nested types.
 *
 * These tests are awesome.
 *
 * @author jdiaz5513
 */

import * as capnp from '../../lib';
import {tap} from '../util';
import {ListMania} from './list-mania.capnp';

tap.test('loop de loop', (t) => {

  t.doesNotThrow(() => {

    const m = new capnp.Message();
    const listMania = m.initRoot(ListMania);

    listMania.initCompositeList(1);

    const compositeList = listMania.getCompositeList();
    // TODO: Interfaces are not implemented yet.
    // const interfaceList = listMania.getInterfaceList();

    compositeList.get(0).setSelf(listMania);
    compositeList.set(0, compositeList.get(0));
    compositeList.get(0).setSelf(listMania);

    t.comment('should zero out overwritten regions');

    const s = m.getSegment(0);
    t.ok(s.isWordZero(0x0a0));
    t.ok(s.isWordZero(0x118));

  });

  t.end();

});

tap.test('1 of each list', (t) => {

  t.doesNotThrow(() => {

    const m = new capnp.Message();
    const listMania = m.initRoot(ListMania);

    listMania.initBoolList(1);
    listMania.initCompositeList(1);
    listMania.initDataList(1);
    listMania.initFloat32List(1);
    listMania.initFloat64List(1);
    listMania.initInt8List(1);
    listMania.initInt16List(1);
    listMania.initInt32List(1);
    listMania.initInt64List(1);
    listMania.initInterfaceList(1);
    listMania.initTextList(1);
    listMania.initUint8List(1);
    listMania.initUint16List(1);
    listMania.initUint32List(1);
    listMania.initUint64List(1);
    listMania.initVoidList(1);

    const boolList = listMania.getBoolList();
    const compositeList = listMania.getCompositeList();
    const dataList = listMania.getDataList();
    const float32List = listMania.getCompositeList();
    const float64List = listMania.getFloat64List();
    const int8List = listMania.getInt8List();
    const int16List = listMania.getInt16List();
    const int32List = listMania.getCompositeList();
    const int64List = listMania.getCompositeList();
    const interfaceList = listMania.getInterfaceList();
    const textList = listMania.getTextList();
    const uint8List = listMania.getUint8List();
    const uint16List = listMania.getUint16List();
    const uint32List = listMania.getUint32List();
    const uint64List = listMania.getUint64List();
    const voidList = listMania.getVoidList();

    boolList.disown().dispose();
    compositeList.disown().dispose();
    dataList.disown().dispose();
    float32List.disown().dispose();
    float64List.disown().dispose();
    int8List.disown().dispose();
    int16List.disown().dispose();
    int32List.disown().dispose();
    int64List.disown().dispose();
    interfaceList.disown().dispose();
    textList.disown().dispose();
    uint8List.disown().dispose();
    uint16List.disown().dispose();
    uint32List.disown().dispose();
    uint64List.disown().dispose();
    voidList.disown().dispose();

  });

  t.end();

});
