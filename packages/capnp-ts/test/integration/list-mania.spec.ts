/**
 * A collection of tests for various list pointer behaviors, especially around handling of nested types.
 *
 * These tests are awesome.
 *
 * @author jdiaz5513
 */

import * as capnp from "../../lib";
import { tap } from "../util";
import { ListMania } from "./list-mania.capnp";

tap.test("loop de loop", t => {
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

    t.comment("should zero out overwritten regions");

    const s = m.getSegment(0);
    t.ok(s.isWordZero(0x0a0));
    t.ok(s.isWordZero(0x118));
  });

  t.end();
});

tap.test("1 of each list", t => {
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
    const float32List = listMania.getFloat32List();
    const float64List = listMania.getFloat64List();
    const int8List = listMania.getInt8List();
    const int16List = listMania.getInt16List();
    const int32List = listMania.getInt32List();
    const int64List = listMania.getInt64List();
    const interfaceList = listMania.getInterfaceList();
    const textList = listMania.getTextList();
    const uint8List = listMania.getUint8List();
    const uint16List = listMania.getUint16List();
    const uint32List = listMania.getUint32List();
    const uint64List = listMania.getUint64List();
    const voidList = listMania.getVoidList();

    // Write some junk data to test erasure after disposal.

    boolList.set(0, true);
    float32List.set(0, 1);
    float64List.set(0, 1);
    int8List.set(0, 1);
    int16List.set(0, 1);
    int32List.set(0, 1);
    int64List.set(0, capnp.Int64.fromNumber(1));
    textList.set(0, "hi");
    uint8List.set(0, 1);
    uint16List.set(0, 1);
    uint32List.set(0, 1);
    uint64List.set(0, capnp.Uint64.fromNumber(1));

    capnp.Pointer.disown(boolList).dispose();
    capnp.Pointer.disown(compositeList).dispose();
    capnp.Pointer.disown(dataList).dispose();
    capnp.Pointer.disown(float32List).dispose();
    capnp.Pointer.disown(float64List).dispose();
    capnp.Pointer.disown(int8List).dispose();
    capnp.Pointer.disown(int16List).dispose();
    capnp.Pointer.disown(int32List).dispose();
    capnp.Pointer.disown(int64List).dispose();
    capnp.Pointer.disown(interfaceList).dispose();
    capnp.Pointer.disown(textList).dispose();
    capnp.Pointer.disown(uint8List).dispose();
    capnp.Pointer.disown(uint16List).dispose();
    capnp.Pointer.disown(uint32List).dispose();
    capnp.Pointer.disown(uint64List).dispose();
    capnp.Pointer.disown(voidList).dispose();

    // Everything after the root pointer should be zero now.

    t.comment("should zero out disposed orphans");

    const s = m.getSegment(0);
    for (let i = 8; i < s.byteLength; i += 8) t.ok(s.isWordZero(i));
  });

  t.end();
});
