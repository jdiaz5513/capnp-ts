/**
 * This file has been automatically generated by the [capnpc-ts utility](https://github.com/jdiaz5513/capnp-ts).
 */

/* tslint:disable */

import * as capnp from "../../lib/index";
export const _id = "b4dbefd56457c333";
export class ListMania extends capnp.Struct {
    static readonly _displayName = "ListMania";
    static readonly _id = "d0a988493b63e78b";
    static readonly _size: capnp.ObjectSize = new capnp.ObjectSize(0, 16);
    static _CompositeList: capnp.ListCtor<ListManiaStruct>;
    adoptBoolList(value: capnp.Orphan<capnp.List<boolean>>): void { this._getPointer(0).adopt(value); }
    disownBoolList(): capnp.Orphan<capnp.List<boolean>> { return this.getBoolList().disown(); }
    getBoolList(): capnp.List<boolean> { return this._getList(0, capnp.BoolList); }
    hasBoolList(): boolean { return !this._getPointer(0)._isNull(); }
    initBoolList(length: number): capnp.List<boolean> { return this._initList(0, capnp.BoolList, length); }
    setBoolList(value: capnp.List<boolean>): void { this._getPointer(0)._copyFrom(value); }
    adoptCompositeList(value: capnp.Orphan<capnp.List<ListManiaStruct>>): void { this._getPointer(1).adopt(value); }
    disownCompositeList(): capnp.Orphan<capnp.List<ListManiaStruct>> { return this.getCompositeList().disown(); }
    getCompositeList(): capnp.List<ListManiaStruct> { return this._getList(1, ListMania._CompositeList); }
    hasCompositeList(): boolean { return !this._getPointer(1)._isNull(); }
    initCompositeList(length: number): capnp.List<ListManiaStruct> { return this._initList(1, ListMania._CompositeList, length); }
    setCompositeList(value: capnp.List<ListManiaStruct>): void { this._getPointer(1)._copyFrom(value); }
    adoptDataList(value: capnp.Orphan<capnp.List<capnp.Data>>): void { this._getPointer(2).adopt(value); }
    disownDataList(): capnp.Orphan<capnp.List<capnp.Data>> { return this.getDataList().disown(); }
    getDataList(): capnp.List<capnp.Data> { return this._getList(2, capnp.DataList); }
    hasDataList(): boolean { return !this._getPointer(2)._isNull(); }
    initDataList(length: number): capnp.List<capnp.Data> { return this._initList(2, capnp.DataList, length); }
    setDataList(value: capnp.List<capnp.Data>): void { this._getPointer(2)._copyFrom(value); }
    adoptFloat32List(value: capnp.Orphan<capnp.List<number>>): void { this._getPointer(3).adopt(value); }
    disownFloat32List(): capnp.Orphan<capnp.List<number>> { return this.getFloat32List().disown(); }
    getFloat32List(): capnp.List<number> { return this._getList(3, capnp.Float32List); }
    hasFloat32List(): boolean { return !this._getPointer(3)._isNull(); }
    initFloat32List(length: number): capnp.List<number> { return this._initList(3, capnp.Float32List, length); }
    setFloat32List(value: capnp.List<number>): void { this._getPointer(3)._copyFrom(value); }
    adoptFloat64List(value: capnp.Orphan<capnp.List<number>>): void { this._getPointer(4).adopt(value); }
    disownFloat64List(): capnp.Orphan<capnp.List<number>> { return this.getFloat64List().disown(); }
    getFloat64List(): capnp.List<number> { return this._getList(4, capnp.Float64List); }
    hasFloat64List(): boolean { return !this._getPointer(4)._isNull(); }
    initFloat64List(length: number): capnp.List<number> { return this._initList(4, capnp.Float64List, length); }
    setFloat64List(value: capnp.List<number>): void { this._getPointer(4)._copyFrom(value); }
    adoptInt8List(value: capnp.Orphan<capnp.List<number>>): void { this._getPointer(5).adopt(value); }
    disownInt8List(): capnp.Orphan<capnp.List<number>> { return this.getInt8List().disown(); }
    getInt8List(): capnp.List<number> { return this._getList(5, capnp.Int8List); }
    hasInt8List(): boolean { return !this._getPointer(5)._isNull(); }
    initInt8List(length: number): capnp.List<number> { return this._initList(5, capnp.Int8List, length); }
    setInt8List(value: capnp.List<number>): void { this._getPointer(5)._copyFrom(value); }
    adoptInt16List(value: capnp.Orphan<capnp.List<number>>): void { this._getPointer(6).adopt(value); }
    disownInt16List(): capnp.Orphan<capnp.List<number>> { return this.getInt16List().disown(); }
    getInt16List(): capnp.List<number> { return this._getList(6, capnp.Int16List); }
    hasInt16List(): boolean { return !this._getPointer(6)._isNull(); }
    initInt16List(length: number): capnp.List<number> { return this._initList(6, capnp.Int16List, length); }
    setInt16List(value: capnp.List<number>): void { this._getPointer(6)._copyFrom(value); }
    adoptInt32List(value: capnp.Orphan<capnp.List<number>>): void { this._getPointer(7).adopt(value); }
    disownInt32List(): capnp.Orphan<capnp.List<number>> { return this.getInt32List().disown(); }
    getInt32List(): capnp.List<number> { return this._getList(7, capnp.Int32List); }
    hasInt32List(): boolean { return !this._getPointer(7)._isNull(); }
    initInt32List(length: number): capnp.List<number> { return this._initList(7, capnp.Int32List, length); }
    setInt32List(value: capnp.List<number>): void { this._getPointer(7)._copyFrom(value); }
    adoptInt64List(value: capnp.Orphan<capnp.List<capnp.Int64>>): void { this._getPointer(8).adopt(value); }
    disownInt64List(): capnp.Orphan<capnp.List<capnp.Int64>> { return this.getInt64List().disown(); }
    getInt64List(): capnp.List<capnp.Int64> { return this._getList(8, capnp.Int64List); }
    hasInt64List(): boolean { return !this._getPointer(8)._isNull(); }
    initInt64List(length: number): capnp.List<capnp.Int64> { return this._initList(8, capnp.Int64List, length); }
    setInt64List(value: capnp.List<capnp.Int64>): void { this._getPointer(8)._copyFrom(value); }
    adoptInterfaceList(value: capnp.Orphan<capnp.List<capnp.Interface>>): void { this._getPointer(9).adopt(value); }
    disownInterfaceList(): capnp.Orphan<capnp.List<capnp.Interface>> { return this.getInterfaceList().disown(); }
    getInterfaceList(): capnp.List<capnp.Interface> { return this._getList(9, capnp.InterfaceList); }
    hasInterfaceList(): boolean { return !this._getPointer(9)._isNull(); }
    initInterfaceList(length: number): capnp.List<capnp.Interface> { return this._initList(9, capnp.InterfaceList, length); }
    setInterfaceList(value: capnp.List<capnp.Interface>): void { this._getPointer(9)._copyFrom(value); }
    adoptTextList(value: capnp.Orphan<capnp.List<string>>): void { this._getPointer(10).adopt(value); }
    disownTextList(): capnp.Orphan<capnp.List<string>> { return this.getTextList().disown(); }
    getTextList(): capnp.List<string> { return this._getList(10, capnp.TextList); }
    hasTextList(): boolean { return !this._getPointer(10)._isNull(); }
    initTextList(length: number): capnp.List<string> { return this._initList(10, capnp.TextList, length); }
    setTextList(value: capnp.List<string>): void { this._getPointer(10)._copyFrom(value); }
    adoptUint8List(value: capnp.Orphan<capnp.List<number>>): void { this._getPointer(11).adopt(value); }
    disownUint8List(): capnp.Orphan<capnp.List<number>> { return this.getUint8List().disown(); }
    getUint8List(): capnp.List<number> { return this._getList(11, capnp.Uint8List); }
    hasUint8List(): boolean { return !this._getPointer(11)._isNull(); }
    initUint8List(length: number): capnp.List<number> { return this._initList(11, capnp.Uint8List, length); }
    setUint8List(value: capnp.List<number>): void { this._getPointer(11)._copyFrom(value); }
    adoptUint16List(value: capnp.Orphan<capnp.List<number>>): void { this._getPointer(12).adopt(value); }
    disownUint16List(): capnp.Orphan<capnp.List<number>> { return this.getUint16List().disown(); }
    getUint16List(): capnp.List<number> { return this._getList(12, capnp.Uint16List); }
    hasUint16List(): boolean { return !this._getPointer(12)._isNull(); }
    initUint16List(length: number): capnp.List<number> { return this._initList(12, capnp.Uint16List, length); }
    setUint16List(value: capnp.List<number>): void { this._getPointer(12)._copyFrom(value); }
    adoptUint32List(value: capnp.Orphan<capnp.List<number>>): void { this._getPointer(13).adopt(value); }
    disownUint32List(): capnp.Orphan<capnp.List<number>> { return this.getUint32List().disown(); }
    getUint32List(): capnp.List<number> { return this._getList(13, capnp.Uint32List); }
    hasUint32List(): boolean { return !this._getPointer(13)._isNull(); }
    initUint32List(length: number): capnp.List<number> { return this._initList(13, capnp.Uint32List, length); }
    setUint32List(value: capnp.List<number>): void { this._getPointer(13)._copyFrom(value); }
    adoptUint64List(value: capnp.Orphan<capnp.List<capnp.Uint64>>): void { this._getPointer(14).adopt(value); }
    disownUint64List(): capnp.Orphan<capnp.List<capnp.Uint64>> { return this.getUint64List().disown(); }
    getUint64List(): capnp.List<capnp.Uint64> { return this._getList(14, capnp.Uint64List); }
    hasUint64List(): boolean { return !this._getPointer(14)._isNull(); }
    initUint64List(length: number): capnp.List<capnp.Uint64> { return this._initList(14, capnp.Uint64List, length); }
    setUint64List(value: capnp.List<capnp.Uint64>): void { this._getPointer(14)._copyFrom(value); }
    adoptVoidList(value: capnp.Orphan<capnp.List<capnp.Void>>): void { this._getPointer(15).adopt(value); }
    disownVoidList(): capnp.Orphan<capnp.List<capnp.Void>> { return this.getVoidList().disown(); }
    getVoidList(): capnp.List<capnp.Void> { return this._getList(15, capnp.VoidList); }
    hasVoidList(): boolean { return !this._getPointer(15)._isNull(); }
    initVoidList(length: number): capnp.List<capnp.Void> { return this._initList(15, capnp.VoidList, length); }
    setVoidList(value: capnp.List<capnp.Void>): void { this._getPointer(15)._copyFrom(value); }
    toString(): string { return "ListMania_" + super.toString(); }
}
export class ListManiaInterface extends capnp.Struct {
    static readonly _displayName = "ListManiaInterface";
    static readonly _id = "8a94079c3c57204f";
    static readonly _size: capnp.ObjectSize = new capnp.ObjectSize(0, 0);
    toString(): string { return "ListManiaInterface_" + super.toString(); }
}
export class ListManiaStruct extends capnp.Struct {
    static readonly _displayName = "ListManiaStruct";
    static readonly _id = "9e1eb66286605522";
    static readonly _size: capnp.ObjectSize = new capnp.ObjectSize(0, 0);
    toString(): string { return "ListManiaStruct_" + super.toString(); }
}
ListMania._CompositeList = capnp.CompositeList(ListManiaStruct);
