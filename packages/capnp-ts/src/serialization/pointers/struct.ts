/**
 * @author jdiaz5513
 */

import initTrace from 'debug';

import {MAX_DEPTH, NATIVE_LITTLE_ENDIAN} from '../../constants';
import * as E from '../../errors';
import {Int64, Uint64} from '../../types';
import {format, padToWord} from '../../util';
import {ListElementSize} from '../list-element-size';
import {ObjectSize} from '../object-size';
import {Segment} from '../segment';
import {Data} from './data';
import {List, ListCtor} from './list';
import {Orphan} from './orphan';
import {Pointer, PointerCtor} from './pointer';
import {PointerType} from './pointer-type';
import {Text} from './text';

const trace = initTrace('capnp:struct');
trace('load');

// Used to apply bit masks (default values).
const TMP_WORD = new DataView(new ArrayBuffer(8));

export interface StructCtor<T extends Struct> {

  readonly _displayName: string;
  readonly _id: string;
  readonly _size: ObjectSize;

  new(segment: Segment, byteOffset: number, depthLimit?: number, compositeIndex?: number): T;

}

export class Struct extends Pointer {

  static readonly _displayName: string = 'Struct';

  private readonly _compositeIndex?: number;

  /**
   * Create a new pointer to a struct.
   *
   * @constructor {Struct}
   * @param {Segment} segment The segment the pointer resides in.
   * @param {number} byteOffset The offset from the beginning of the segment to the beginning of the pointer data.
   * @param {any} [depthLimit=MAX_DEPTH] The nesting depth limit for this object.
   * @param {number} [compositeIndex] If set, then this pointer is actually a reference to a composite list
   * (`this._getPointerTargetType() === PointerType.LIST`), and this number is used as the index of the struct within
   * the list. It is not valid to call `initStruct()` on a composite struct – the struct contents are initialized when
   * the list pointer is initialized.
   */

  constructor(segment: Segment, byteOffset: number, depthLimit = MAX_DEPTH, compositeIndex?: number) {

    super(segment, byteOffset, depthLimit);

    this._compositeIndex = compositeIndex;

  }

  static toString(): string {

    return this._displayName;

  }

  /**
   * Get a pointer to the beginning of this struct's content. If `_compositeIndex` is set, it will be offset by a
   * multiple of the struct's size.
   *
   * @internal
   * @returns {Pointer} A pointer to the beginning of the struct's content.
   */

  _getContent(): Pointer {

    const c = super._getContent();

    if (this._compositeIndex !== undefined) {

      // Seek backwards by one word so we can read the struct size off the tag word.

      c.byteOffset -= 8;

      // Seek ahead by `_compositeIndex` multiples of the struct's total size.

      c.byteOffset += 8 + this._compositeIndex * c._getStructSize().padToWord().getByteLength();

    }

    return c;

  }

  /**
   * Initialize this struct with the provided object size. This will allocate new space for the struct contents, ideally
   * in the same segment as this pointer.
   *
   * @internal
   * @param {ObjectSize} size An object describing the size of the struct's data and pointer sections.
   * @returns {void}
   */

  _initStruct(size: ObjectSize): void {

    if (this._compositeIndex !== undefined) throw new Error(format(E.PTR_INIT_COMPOSITE_STRUCT, this));

    const c = this.segment.allocate(size.getByteLength());

    const res = this._initPointer(c.segment, c.byteOffset);

    res.pointer._setStructPointer(res.offsetWords, size);

  }

  _initStructAt<T extends Struct>(index: number, StructClass: StructCtor<T>): T {

    const s = this._getPointerAs(index, StructClass);

    s._initStruct(StructClass._size);

    return s;

  }

  toString() {

    return `Struct_${super.toString()}${this._compositeIndex === undefined ? '' : `,ci:${this._compositeIndex}`}`;

  }

  /**
   * Copy the contents of `src` to this struct. Newer fields in `src` will be omitted, and fields in this struct that
   * do not exist in `src` will be set to their default values (zeroed out).
   *
   * @internal
   * @param {Struct} _src The source struct to copy.
   * @returns {void}
   */

  _copyStruct(_src: Struct): void {

    throw new Error(format(NOT_IMPLEMENTED, 'Struct.prototype.copyStruct'));

  }

  adopt(src: Orphan<this>): void {

    if (this._compositeIndex !== undefined) throw new Error(format(E.PTR_ADOPT_COMPOSITE_STRUCT, this));

    super.adopt(src);

  }

  disown(): Orphan<this> {

    if (this._compositeIndex !== undefined) throw new Error(format(E.PTR_DISOWN_COMPOSITE_STRUCT, this));

    return super.disown();

  }

  /**
   * Convert this struct to a struct of the provided class. Particularly useful when casting to nested group types.
   *
   * @protected
   * @template T
   * @param {StructCtor<T>} StructClass The struct class to convert to. Not particularly useful if `Struct`.
   * @returns {T} A new instance of the desired struct class pointing to the same location.
   */

  protected _getAs<T extends Struct>(StructClass: StructCtor<T>): T {

    return new StructClass(this.segment, this.byteOffset, this._depthLimit, this._compositeIndex);

  }

  /**
   * Read a boolean (bit) value out of this struct.
   *
   * @protected
   * @param {number} bitOffset The offset in **bits** from the start of the data section.
   * @param {DataView} [defaultMask] The default value as a DataView.
   * @returns {boolean} The value.
   */

  protected _getBit(bitOffset: number, defaultMask?: DataView): boolean {

    const byteOffset = Math.floor(bitOffset / 8);
    const bitMask = 1 << bitOffset % 8;

    this._checkDataBounds(byteOffset, 1);

    const ds = this._getDataSection();

    const v = ds.segment.getUint8(ds.byteOffset + byteOffset);

    if (defaultMask === undefined) return (v & bitMask) !== 0;

    const defaultValue = defaultMask.getUint8(0);
    return ((v ^ defaultValue) & bitMask) !== 0;

  }

  protected _getData(index: number): Data {

    this._checkPointerBounds(index);

    const ps = this._getPointerSection();

    ps.byteOffset += index * 8;

    const l = new Data(ps.segment, ps.byteOffset, this._depthLimit - 1);

    if (l._isNull()) {

      l._initList(ListElementSize.BYTE, 0);

    }

    return l;
  }

  protected _getDataSection(): Pointer {

    return this._getContent();

  }

  /**
   * Read a float32 value out of this struct.
   *
   * @param {number} byteOffset The offset in bytes from the start of the data section.
   * @param {DataView} [defaultMask] The default value as a DataView.
   * @returns {number} The value.
   */

  protected _getFloat32(byteOffset: number, defaultMask?: DataView): number {

    this._checkDataBounds(byteOffset, 4);

    const ds = this._getDataSection();

    if (defaultMask === undefined) return ds.segment.getFloat32(ds.byteOffset + byteOffset);

    const v = ds.segment.getUint32(ds.byteOffset + byteOffset) ^ defaultMask.getUint32(0, true);
    TMP_WORD.setUint32(0, v, NATIVE_LITTLE_ENDIAN);
    return TMP_WORD.getFloat32(0, NATIVE_LITTLE_ENDIAN);

  }

  /**
   * Read a float64 value out of this segment.
   *
   * @param {number} byteOffset The offset in bytes from the start of the data section.
   * @param {DataView} [defaultMask] The default value as a DataView.
   * @returns {number} The value.
   */

  protected _getFloat64(byteOffset: number, defaultMask?: DataView): number {

    this._checkDataBounds(byteOffset, 8);

    const ds = this._getDataSection();

    if (defaultMask !== undefined) {

      const lo = ds.segment.getUint32(ds.byteOffset + byteOffset) ^ defaultMask.getUint32(0, true);
      const hi = ds.segment.getUint32(ds.byteOffset + byteOffset + 4) ^ defaultMask.getUint32(4, true);
      TMP_WORD.setUint32(0, lo, NATIVE_LITTLE_ENDIAN);
      TMP_WORD.setUint32(4, hi, NATIVE_LITTLE_ENDIAN);
      return TMP_WORD.getFloat64(0, NATIVE_LITTLE_ENDIAN);

    }

    return ds.segment.getFloat64(ds.byteOffset + byteOffset);

  }

  /**
   * Read an int16 value out of this segment.
   *
   * @param {number} byteOffset The offset in bytes from the start of the data section.
   * @param {DataView} [defaultMask] The default value as a DataView.
   * @returns {number} The value.
   */

  protected _getInt16(byteOffset: number, defaultMask?: DataView): number {

    this._checkDataBounds(byteOffset, 2);

    const ds = this._getDataSection();

    if (defaultMask === undefined) return ds.segment.getInt16(ds.byteOffset + byteOffset);

    const v = ds.segment.getUint16(ds.byteOffset + byteOffset) ^ defaultMask.getUint16(0, true);
    TMP_WORD.setUint16(0, v, NATIVE_LITTLE_ENDIAN);
    return TMP_WORD.getInt16(0, NATIVE_LITTLE_ENDIAN);

  }

  /**
   * Read an int32 value out of this segment.
   *
   * @param {number} byteOffset The offset in bytes from the start of the data section.
   * @param {DataView} [defaultMask] The default value as a DataView.
   * @returns {number} The value.
   */

  protected _getInt32(byteOffset: number, defaultMask?: DataView): number {

    this._checkDataBounds(byteOffset, 4);

    const ds = this._getDataSection();

    if (defaultMask === undefined) return ds.segment.getInt32(ds.byteOffset + byteOffset);

    const v = ds.segment.getUint32(ds.byteOffset + byteOffset) ^ defaultMask.getUint16(0, true);
    TMP_WORD.setUint32(0, v, NATIVE_LITTLE_ENDIAN);
    return TMP_WORD.getInt32(0, NATIVE_LITTLE_ENDIAN);

  }

  /**
   * Read an int64 value out of this segment.
   *
   * @param {number} byteOffset The offset in bytes from the start of the data section.
   * @param {DataView} [defaultMask] The default value as a DataView.
   * @returns {number} The value.
   */

  protected _getInt64(byteOffset: number, defaultMask?: DataView): Int64 {

    this._checkDataBounds(byteOffset, 8);

    const ds = this._getDataSection();

    if (defaultMask === undefined) return ds.segment.getInt64(ds.byteOffset + byteOffset);

    const lo = ds.segment.getUint32(ds.byteOffset + byteOffset) ^ defaultMask.getUint32(0, true);
    const hi = ds.segment.getUint32(ds.byteOffset + byteOffset + 4) ^ defaultMask.getUint32(4, true);
    TMP_WORD.setUint32(0, lo, NATIVE_LITTLE_ENDIAN);
    TMP_WORD.setUint32(4, hi, NATIVE_LITTLE_ENDIAN);
    return new Int64(new Uint8Array(TMP_WORD.buffer.slice(0)));

  }

  /**
   * Read an int8 value out of this segment.
   *
   * @param {number} byteOffset The offset in bytes from the start of the data section.
   * @param {DataView} [defaultMask] The default value as a DataView.
   * @returns {number} The value.
   */

  protected _getInt8(byteOffset: number, defaultMask?: DataView): number {

    this._checkDataBounds(byteOffset, 1);

    const ds = this._getDataSection();

    if (defaultMask === undefined) return ds.segment.getInt8(ds.byteOffset + byteOffset);

    const v = ds.segment.getUint8(ds.byteOffset + byteOffset) ^ defaultMask.getUint8(0);
    TMP_WORD.setUint8(0, v);
    return TMP_WORD.getInt8(0);

  }

  protected _getList<T>(index: number, ListClass: ListCtor<T>): List<T> {

    this._checkPointerBounds(index);

    const ps = this._getPointerSection();

    ps.byteOffset += index * 8;

    const l = new ListClass(ps.segment, ps.byteOffset, this._depthLimit - 1);

    if (l._isNull()) {

      l._initList(ListClass._size, 0, ListClass._compositeSize);

    }

    return l;

  }

  protected _getPointer(index: number): Pointer {

    this._checkPointerBounds(index);

    const ps = this._getPointerSection();

    ps.byteOffset += index * 8;

    return new Pointer(ps.segment, ps.byteOffset, this._depthLimit - 1);

  }

  protected _getPointerAs<T extends Pointer>(index: number, PointerClass: PointerCtor<T>): T {

    this._checkPointerBounds(index);

    const ps = this._getPointerSection();

    ps.byteOffset += index * 8;

    return new PointerClass(ps.segment, ps.byteOffset, this._depthLimit - 1);

  }

  protected _getPointerSection(): Pointer {

    const ps = this._getContent();

    ps.byteOffset += padToWord(this._getSize().dataByteLength);

    return ps;

  }

  protected _getSize(): ObjectSize {

    if (this._compositeIndex !== undefined) {

      // For composite lists the object size is stored in a tag word right before the content.

      const c = super._getContent();

      c.byteOffset -= 8;

      return c._getStructSize();

    }

    return this._getTargetStructSize();

  }

  protected _getStruct<T extends Struct>(index: number, StructClass: StructCtor<T>): T {

    const s = this._getPointerAs(index, StructClass);

    if (s._isNull()) {

      s._initStruct(StructClass._size);

    } else {

      s._validate(PointerType.STRUCT, undefined, StructClass._size);

    }

    return s;

  }

  protected _getText(index: number): string {

    return Text.fromPointer(this._getPointer(index)).get(0);

  }

  /**
   * Read an uint16 value out of this segment.
   *
   * @param {number} byteOffset The offset in bytes from the start of the data section.
   * @param {DataView} [defaultMask] The default value as a DataView.
   * @returns {number} The value.
   */

  protected _getUint16(byteOffset: number, defaultMask?: DataView): number {

    this._checkDataBounds(byteOffset, 2);

    const ds = this._getDataSection();

    if (defaultMask === undefined) return ds.segment.getUint16(ds.byteOffset + byteOffset);

    return ds.segment.getUint16(ds.byteOffset + byteOffset) ^ defaultMask.getUint16(0, true);

  }

  /**
   * Read an uint32 value out of this segment.
   *
   * @param {number} byteOffset The offset in bytes from the start of the data section.
   * @param {DataView} [defaultMask] The default value as a DataView.
   * @returns {number} The value.
   */

  protected _getUint32(byteOffset: number, defaultMask?: DataView): number {

    this._checkDataBounds(byteOffset, 4);

    const ds = this._getDataSection();

    if (defaultMask === undefined) return ds.segment.getUint32(ds.byteOffset + byteOffset);

    return ds.segment.getUint32(ds.byteOffset + byteOffset) ^ defaultMask.getUint32(0, true);

  }

  /**
   * Read an uint64 value out of this segment.
   *
   * @param {number} byteOffset The offset in bytes from the start of the data section.
   * @param {DataView} [defaultMask] The default value as a DataView.
   * @returns {number} The value.
   */

  protected _getUint64(byteOffset: number, defaultMask?: DataView): Uint64 {

    this._checkDataBounds(byteOffset, 8);

    const ds = this._getDataSection();

    if (defaultMask === undefined) return ds.segment.getUint64(ds.byteOffset + byteOffset);

    const lo = ds.segment.getUint32(ds.byteOffset + byteOffset) ^ defaultMask.getUint32(0, true);
    const hi = ds.segment.getUint32(ds.byteOffset + byteOffset + 4) ^ defaultMask.getUint32(4, true);
    TMP_WORD.setUint32(0, lo, NATIVE_LITTLE_ENDIAN);
    TMP_WORD.setUint32(4, hi, NATIVE_LITTLE_ENDIAN);
    return new Uint64(new Uint8Array(TMP_WORD.buffer.slice(0)));

  }

  /**
   * Read an uint8 value out of this segment.
   *
   * @param {number} byteOffset The offset in bytes from the start of the data section.
   * @param {DataView} [defaultMask] The default value as a DataView.
   * @returns {number} The value.
   */

  protected _getUint8(byteOffset: number, defaultMask?: DataView): number {

    this._checkDataBounds(byteOffset, 1);

    const ds = this._getDataSection();

    if (defaultMask === undefined) return ds.segment.getUint8(ds.byteOffset + byteOffset);

    return ds.segment.getUint8(ds.byteOffset + byteOffset) ^ defaultMask.getUint8(0);

  }

  protected _initData(index: number, length: number): Data {

    this._checkPointerBounds(index);

    const ps = this._getPointerSection();

    ps.byteOffset += index * 8;

    const l = new Data(ps.segment, ps.byteOffset, this._depthLimit - 1);

    l._initList(ListElementSize.BYTE, length);

    return l;

  }

  protected _initList<T>(index: number, ListClass: ListCtor<T>, length: number): List<T> {

    this._checkPointerBounds(index);

    const ps = this._getPointerSection();

    ps.byteOffset += index * 8;

    const l = new ListClass(ps.segment, ps.byteOffset, this._depthLimit - 1);

    l._initList(ListClass._size, length, ListClass._compositeSize);

    return l;

  }

  /**
   * Write a boolean (bit) value to the struct.
   *
   * @protected
   * @param {number} bitOffset The offset in **bits** from the start of the data section.
   * @param {boolean} value The value to write (writes a 0 for `false`, 1 for `true`).
   * @param {DataView} [defaultMask] The default value as a DataView.
   * @returns {void}
   */

  protected _setBit(bitOffset: number, value: boolean, defaultMask?: DataView): void {

    const byteOffset = Math.floor(bitOffset / 8);
    const bitMask = 1 << bitOffset % 8;

    this._checkDataBounds(byteOffset, 1);

    const ds = this._getDataSection();

    const b = ds.segment.getUint8(ds.byteOffset + byteOffset);

    // If the default mask bit is set, that means `true` values are actually written as `0`.

    if (defaultMask !== undefined) value = (defaultMask.getUint8(0) & bitMask) !== 0 ? !value : value;

    ds.segment.setUint8(ds.byteOffset + byteOffset, value ? b | bitMask : b & ~bitMask);

  }

  /**
   * Write a primitive float32 value to the struct.
   *
   * @protected
   * @param {number} byteOffset The offset in bytes from the start of the data section.
   * @param {number} value The value to write.
   * @param {DataView} [defaultMask] The default value as a DataView.
   * @returns {void}
   */

  protected _setFloat32(byteOffset: number, value: number, defaultMask?: DataView): void {

    this._checkDataBounds(byteOffset, 4);

    const ds = this._getDataSection();

    if (defaultMask !== undefined) {

      TMP_WORD.setFloat32(0, value, NATIVE_LITTLE_ENDIAN);
      const v = TMP_WORD.getUint32(0, NATIVE_LITTLE_ENDIAN) ^ defaultMask.getUint32(0, true);
      ds.segment.setUint32(ds.byteOffset + byteOffset, v);

      return;

    }

    ds.segment.setFloat32(ds.byteOffset + byteOffset, value);

  }

  /**
   * Write a primitive float64 value to the struct.
   *
   * @protected
   * @param {number} byteOffset The offset in bytes from the start of the data section.
   * @param {number} value The value to write.
   * @param {DataView} [defaultMask] The default value as a DataView.
   * @returns {void}
   */

  protected _setFloat64(byteOffset: number, value: number, defaultMask?: DataView): void {

    this._checkDataBounds(byteOffset, 8);

    const ds = this._getDataSection();

    if (defaultMask !== undefined) {

      TMP_WORD.setFloat64(0, value, NATIVE_LITTLE_ENDIAN);
      const lo = TMP_WORD.getUint32(0, NATIVE_LITTLE_ENDIAN) ^ defaultMask.getUint32(0, true);
      const hi = TMP_WORD.getUint32(4, NATIVE_LITTLE_ENDIAN) ^ defaultMask.getUint32(4, true);
      ds.segment.setUint32(ds.byteOffset + byteOffset, lo);
      ds.segment.setUint32(ds.byteOffset + byteOffset + 4, hi);

      return;

    }

    ds.segment.setFloat64(ds.byteOffset + byteOffset, value);

  }

  /**
   * Write a primitive int16 value to the struct.
   *
   * @protected
   * @param {number} byteOffset The offset in bytes from the start of the data section.
   * @param {number} value The value to write.
   * @param {DataView} [defaultMask] The default value as a DataView.
   * @returns {void}
   */

  protected _setInt16(byteOffset: number, value: number, defaultMask?: DataView): void {

    this._checkDataBounds(byteOffset, 2);

    const ds = this._getDataSection();

    if (defaultMask !== undefined) {

      TMP_WORD.setInt16(0, value, NATIVE_LITTLE_ENDIAN);
      const v = TMP_WORD.getUint16(0, NATIVE_LITTLE_ENDIAN) ^ defaultMask.getUint16(0, true);
      ds.segment.setUint16(ds.byteOffset + byteOffset, v);

      return;

    }

    ds.segment.setInt16(ds.byteOffset + byteOffset, value);

  }

  /**
   * Write a primitive int32 value to the struct.
   *
   * @protected
   * @param {number} byteOffset The offset in bytes from the start of the data section.
   * @param {number} value The value to write.
   * @param {DataView} [defaultMask] The default value as a DataView.
   * @returns {void}
   */

  protected _setInt32(byteOffset: number, value: number, defaultMask?: DataView): void {

    this._checkDataBounds(byteOffset, 4);

    const ds = this._getDataSection();

    if (defaultMask !== undefined) {

      TMP_WORD.setInt32(0, value, NATIVE_LITTLE_ENDIAN);
      const v = TMP_WORD.getUint32(0, NATIVE_LITTLE_ENDIAN) ^ defaultMask.getUint32(0, true);
      ds.segment.setUint32(ds.byteOffset + byteOffset, v);

      return;

    }

    ds.segment.setInt32(ds.byteOffset + byteOffset, value);

  }

  /**
   * Write a primitive int64 value to the struct.
   *
   * @protected
   * @param {number} byteOffset The offset in bytes from the start of the data section.
   * @param {number} value The value to write.
   * @param {DataView} [defaultMask] The default value as a DataView.
   * @returns {void}
   */

  protected _setInt64(byteOffset: number, value: Int64, defaultMask?: DataView): void {

    this._checkDataBounds(byteOffset, 8);

    const ds = this._getDataSection();

    if (defaultMask !== undefined) {

      // PERF: We could cast the Int64 to a DataView to apply the mask using four 32-bit reads, but we already have a
      // typed array so avoiding the object allocation turns out to be slightly faster. Int64 is guaranteed to be in
      // little-endian format by design.

      for (let i = 0; i < 8; i++) {

        ds.segment.setUint8(ds.byteOffset + byteOffset + i, value.buffer[i] ^ defaultMask.getUint8(i));

      }

      return;

    }

    ds.segment.setInt64(ds.byteOffset + byteOffset, value);

  }

  /**
   * Write a primitive int8 value to the struct.
   *
   * @protected
   * @param {number} byteOffset The offset in bytes from the start of the data section.
   * @param {number} value The value to write.
   * @param {DataView} [defaultMask] The default value as a DataView.
   * @returns {void}
   */

  protected _setInt8(byteOffset: number, value: number, defaultMask?: DataView): void {

    this._checkDataBounds(byteOffset, 1);

    const ds = this._getDataSection();

    if (defaultMask !== undefined) {

      TMP_WORD.setInt8(0, value);
      const v = TMP_WORD.getUint8(0) ^ defaultMask.getUint8(0);
      ds.segment.setUint8(ds.byteOffset + byteOffset, v);

      return;

    }

    ds.segment.setInt8(ds.byteOffset + byteOffset, value);

  }

  protected _setPointer(index: number, value: Pointer): void {

    this._getPointer(index)._copyFrom(value);

  }

  protected _setText(index: number, value: string): void {

    Text.fromPointer(this._getPointer(index)).set(0, value);

  }

  /**
   * Write a primitive uint16 value to the struct.
   *
   * @protected
   * @param {number} byteOffset The offset in bytes from the start of the data section.
   * @param {number} value The value to write.
   * @param {DataView} [defaultMask] The default value as a DataView.
   * @returns {void}
   */

  protected _setUint16(byteOffset: number, value: number, defaultMask?: DataView): void {

    this._checkDataBounds(byteOffset, 2);

    const ds = this._getDataSection();

    if (defaultMask !== undefined) value ^= defaultMask.getUint16(0, true);

    ds.segment.setUint16(ds.byteOffset + byteOffset, value);

  }

  /**
   * Write a primitive uint32 value to the struct.
   *
   * @protected
   * @param {number} byteOffset The offset in bytes from the start of the data section.
   * @param {number} value The value to write.
   * @param {DataView} [defaultMask] The default value as a DataView.
   * @returns {void}
   */

  protected _setUint32(byteOffset: number, value: number, defaultMask?: DataView): void {

    this._checkDataBounds(byteOffset, 4);

    const ds = this._getDataSection();

    if (defaultMask !== undefined) value ^= defaultMask.getUint32(0, true);

    ds.segment.setUint32(ds.byteOffset + byteOffset, value);

  }

  /**
   * Write a primitive uint64 value to the struct.
   *
   * @protected
   * @param {number} byteOffset The offset in bytes from the start of the data section.
   * @param {number} value The value to write.
   * @param {DataView} [defaultMask] The default value as a DataView.
   * @returns {void}
   */

  protected _setUint64(byteOffset: number, value: Uint64, defaultMask?: DataView): void {

    this._checkDataBounds(byteOffset, 8);

    const ds = this._getDataSection();

    if (defaultMask !== undefined) {

      // PERF: We could cast the Uint64 to a DataView to apply the mask using four 32-bit reads, but we already have a
      // typed array so avoiding the object allocation turns out to be slightly faster. Uint64 is guaranteed to be in
      // little-endian format by design.

      for (let i = 0; i < 8; i++) {

        ds.segment.setUint8(ds.byteOffset + byteOffset + i, value.buffer[i] ^ defaultMask.getUint8(i));

      }

      return;

    }

    ds.segment.setUint64(ds.byteOffset + byteOffset, value);

  }

  /**
   * Write a primitive uint8 value to the struct.
   *
   * @protected
   * @param {number} byteOffset The offset in bytes from the start of the data section.
   * @param {number} value The value to write.
   * @param {DataView} [defaultMask] The default value as a DataView.
   * @returns {void}
   */

  protected _setUint8(byteOffset: number, value: number, defaultMask?: DataView): void {

    this._checkDataBounds(byteOffset, 1);

    const ds = this._getDataSection();

    if (defaultMask !== undefined) value ^= defaultMask.getUint8(0);

    ds.segment.setUint8(ds.byteOffset + byteOffset, value);

  }

  protected _testWhich(name: string, found: number, wanted: number): void {

    if (found !== wanted) throw new Error(format(E.PTR_INVALID_UNION_ACCESS, this, name, found, wanted));

  }

  private _checkDataBounds(byteOffset: number, byteLength: number): void {

    const dataByteLength = this._getSize().dataByteLength;

    if (byteOffset < 0 || byteLength < 0 || byteOffset + byteLength > dataByteLength) {

      throw new Error(format(E.PTR_STRUCT_DATA_OUT_OF_BOUNDS, this, byteLength, byteOffset, dataByteLength));

    }

  }

  private _checkPointerBounds(index: number): void {

    const pointerLength = this._getSize().pointerLength;

    if (index < 0 || index >= pointerLength) {

      throw new Error(format(E.PTR_STRUCT_POINTER_OUT_OF_BOUNDS, this, index, pointerLength));

    }

  }

}
