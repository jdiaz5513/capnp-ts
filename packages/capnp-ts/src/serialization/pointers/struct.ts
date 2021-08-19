/**
 * @author jdiaz5513
 */

import initTrace from "debug";

import { MAX_DEPTH, NATIVE_LITTLE_ENDIAN } from "../../constants";
import { Int64, Uint64 } from "../../types/index";
import { format, padToWord } from "../../util";
import { ListElementSize } from "../list-element-size";
import { ObjectSize, getByteLength, getDataWordLength, getWordLength } from "../object-size";
import { Segment } from "../segment";
import { Data } from "./data";
import { List, ListCtor } from "./list";
import { Orphan } from "./orphan";
import {
  _Pointer,
  _PointerCtor,
  Pointer,
  PointerCtor,
  getContent,
  getStructSize,
  initPointer,
  erase,
  setStructPointer,
  followFars,
  getTargetListElementSize,
  getTargetPointerType,
  isNull,
  getTargetCompositeListSize,
  getTargetListLength,
  setListPointer,
  getTargetStructSize,
  validate,
  copyFrom,
} from "./pointer";
import { PointerType } from "./pointer-type";
import { Text } from "./text";
import {
  PTR_INIT_COMPOSITE_STRUCT,
  PTR_ADOPT_COMPOSITE_STRUCT,
  PTR_DISOWN_COMPOSITE_STRUCT,
  PTR_INVALID_UNION_ACCESS,
  PTR_STRUCT_DATA_OUT_OF_BOUNDS,
  PTR_STRUCT_POINTER_OUT_OF_BOUNDS,
  INVARIANT_UNREACHABLE_CODE,
} from "../../errors";

const trace = initTrace("capnp:struct");
trace("load");

// Used to apply bit masks (default values).
const TMP_WORD = new DataView(new ArrayBuffer(8));

export interface _StructCtor extends _PointerCtor {
  readonly id: string;
  readonly size: ObjectSize;
}

export interface StructCtor<T extends Struct> {
  readonly _capnp: _StructCtor;

  new (segment: Segment, byteOffset: number, depthLimit?: number, compositeIndex?: number): T;
}

export interface _Struct extends _Pointer {
  compositeIndex?: number;
}

export class Struct extends Pointer {
  static readonly _capnp = {
    displayName: "Struct" as string,
  };
  static readonly getAs = getAs;
  static readonly getBit = getBit;
  static readonly getData = getData;
  static readonly getFloat32 = getFloat32;
  static readonly getFloat64 = getFloat64;
  static readonly getUint8 = getUint8;
  static readonly getUint16 = getUint16;
  static readonly getUint32 = getUint32;
  static readonly getUint64 = getUint64;
  static readonly getInt8 = getInt8;
  static readonly getInt16 = getInt16;
  static readonly getInt32 = getInt32;
  static readonly getInt64 = getInt64;
  static readonly getList = getList;
  static readonly getPointer = getPointer;
  static readonly getPointerAs = getPointerAs;
  static readonly getStruct = getStruct;
  static readonly getText = getText;
  static readonly initData = initData;
  static readonly initList = initList;
  static readonly initStruct = initStruct;
  static readonly initStructAt = initStructAt;
  static readonly setBit = setBit;
  static readonly setFloat32 = setFloat32;
  static readonly setFloat64 = setFloat64;
  static readonly setUint8 = setUint8;
  static readonly setUint16 = setUint16;
  static readonly setUint32 = setUint32;
  static readonly setUint64 = setUint64;
  static readonly setInt8 = setInt8;
  static readonly setInt16 = setInt16;
  static readonly setInt32 = setInt32;
  static readonly setInt64 = setInt64;
  static readonly setText = setText;
  static readonly testWhich = testWhich;

  readonly _capnp!: _Struct;

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

    this._capnp.compositeIndex = compositeIndex;
    this._capnp.compositeList = compositeIndex !== undefined;
  }

  static toString(): string {
    return this._capnp.displayName;
  }

  toString(): string {
    return (
      `Struct_${super.toString()}` +
      `${this._capnp.compositeIndex === undefined ? "" : `,ci:${this._capnp.compositeIndex}`}`
    );
  }
}

/**
 * Initialize a struct with the provided object size. This will allocate new space for the struct contents, ideally in
 * the same segment as this pointer.
 *
 * @param {ObjectSize} size An object describing the size of the struct's data and pointer sections.
 * @param {Struct} s The struct to initialize.
 * @returns {void}
 */

export function initStruct(size: ObjectSize, s: Struct): void {
  if (s._capnp.compositeIndex !== undefined) {
    throw new Error(format(PTR_INIT_COMPOSITE_STRUCT, s));
  }

  // Make sure to clear existing contents before overwriting the pointer data (erase is a noop if already empty).

  erase(s);

  const c = s.segment.allocate(getByteLength(size));

  const res = initPointer(c.segment, c.byteOffset, s);

  setStructPointer(res.offsetWords, size, res.pointer);
}

export function initStructAt<T extends Struct>(index: number, StructClass: StructCtor<T>, p: Pointer): T {
  const s = getPointerAs(index, StructClass, p);

  initStruct(StructClass._capnp.size, s);

  return s;
}

/**
 * Make a shallow copy of a struct's contents and update the pointer to point to the new content. The data and pointer
 * sections will be resized to the provided size.
 *
 * WARNING: This method can cause data loss if `dstSize` is smaller than the original size!
 *
 * @param {ObjectSize} dstSize The desired size for the struct contents.
 * @param {Struct} s The struct to resize.
 * @returns {void}
 */

export function resize(dstSize: ObjectSize, s: Struct): void {
  const srcSize = getSize(s);
  const srcContent = getContent(s);
  const dstContent = s.segment.allocate(getByteLength(dstSize));

  // Only copy the data section for now. The pointer section will need to be rewritten.
  dstContent.segment.copyWords(
    dstContent.byteOffset,
    srcContent.segment,
    srcContent.byteOffset,
    Math.min(getDataWordLength(srcSize), getDataWordLength(dstSize))
  );

  const res = initPointer(dstContent.segment, dstContent.byteOffset, s);

  setStructPointer(res.offsetWords, dstSize, res.pointer);

  // Iterate through the new pointer section and update the offsets so they point to the right place. This is a bit
  // more complicated than it appears due to the fact that the original pointers could have been far pointers, and
  // the new pointers might need to be allocated as far pointers if the segment is full.

  for (let i = 0; i < Math.min(srcSize.pointerLength, dstSize.pointerLength); i++) {
    const srcPtr = new Pointer(srcContent.segment, srcContent.byteOffset + srcSize.dataByteLength + i * 8);
    if (isNull(srcPtr)) {
      // If source pointer is null, leave the destination pointer as default null.
      continue;
    }
    const srcPtrTarget = followFars(srcPtr);
    const srcPtrContent = getContent(srcPtr);
    const dstPtr = new Pointer(dstContent.segment, dstContent.byteOffset + dstSize.dataByteLength + i * 8);

    // For composite lists the offset needs to point to the tag word, not the first element which is what getContent
    // returns.

    if (
      getTargetPointerType(srcPtr) === PointerType.LIST &&
      getTargetListElementSize(srcPtr) === ListElementSize.COMPOSITE
    ) {
      srcPtrContent.byteOffset -= 8;
    }

    const r = initPointer(srcPtrContent.segment, srcPtrContent.byteOffset, dstPtr);

    // Read the old pointer data, but discard the original offset.

    const a = srcPtrTarget.segment.getUint8(srcPtrTarget.byteOffset) & 0x03;
    const b = srcPtrTarget.segment.getUint32(srcPtrTarget.byteOffset + 4);

    r.pointer.segment.setUint32(r.pointer.byteOffset, a | (r.offsetWords << 2));
    r.pointer.segment.setUint32(r.pointer.byteOffset + 4, b);
  }

  // Zero out the old data and pointer sections.

  srcContent.segment.fillZeroWords(srcContent.byteOffset, getWordLength(srcSize));
}

export function adopt<T extends Struct>(src: Orphan<T>, s: Struct): void {
  if (s._capnp.compositeIndex !== undefined) {
    throw new Error(format(PTR_ADOPT_COMPOSITE_STRUCT, s));
  }

  Pointer.adopt(src, s);
}

export function disown<T extends Struct>(s: Struct): Orphan<T> {
  if (s._capnp.compositeIndex !== undefined) {
    throw new Error(format(PTR_DISOWN_COMPOSITE_STRUCT, s));
  }

  return Pointer.disown(s);
}

/**
 * Convert a struct to a struct of the provided class. Particularly useful when casting to nested group types.
 *
 * @protected
 * @template T
 * @param {StructCtor<T>} StructClass The struct class to convert to. Not particularly useful if `Struct`.
 * @param {Struct} s The struct to convert.
 * @returns {T} A new instance of the desired struct class pointing to the same location.
 */

export function getAs<T extends Struct>(StructClass: StructCtor<T>, s: Struct): T {
  return new StructClass(s.segment, s.byteOffset, s._capnp.depthLimit, s._capnp.compositeIndex);
}

/**
 * Read a boolean (bit) value out of a struct.
 *
 * @protected
 * @param {number} bitOffset The offset in **bits** from the start of the data section.
 * @param {Struct} s The struct to read from.
 * @param {DataView} [defaultMask] The default value as a DataView.
 * @returns {boolean} The value.
 */

export function getBit(bitOffset: number, s: Struct, defaultMask?: DataView): boolean {
  const byteOffset = Math.floor(bitOffset / 8);
  const bitMask = 1 << bitOffset % 8;

  checkDataBounds(byteOffset, 1, s);

  const ds = getDataSection(s);

  const v = ds.segment.getUint8(ds.byteOffset + byteOffset);

  if (defaultMask === undefined) return (v & bitMask) !== 0;

  const defaultValue = defaultMask.getUint8(0);
  return ((v ^ defaultValue) & bitMask) !== 0;
}

export function getData(index: number, s: Struct, defaultValue?: Pointer): Data {
  checkPointerBounds(index, s);

  const ps = getPointerSection(s);

  ps.byteOffset += index * 8;

  const l = new Data(ps.segment, ps.byteOffset, s._capnp.depthLimit - 1);

  if (isNull(l)) {
    if (defaultValue) {
      Pointer.copyFrom(defaultValue, l);
    } else {
      List.initList(ListElementSize.BYTE, 0, l);
    }
  }

  return l;
}

export function getDataSection(s: Struct): Pointer {
  return getContent(s);
}

/**
 * Read a float32 value out of a struct.
 *
 * @param {number} byteOffset The offset in bytes from the start of the data section.
 * @param {Struct} s The struct to read from.
 * @param {DataView} [defaultMask] The default value as a DataView.
 * @returns {number} The value.
 */

export function getFloat32(byteOffset: number, s: Struct, defaultMask?: DataView): number {
  checkDataBounds(byteOffset, 4, s);

  const ds = getDataSection(s);

  if (defaultMask === undefined) {
    return ds.segment.getFloat32(ds.byteOffset + byteOffset);
  }

  const v = ds.segment.getUint32(ds.byteOffset + byteOffset) ^ defaultMask.getUint32(0, true);
  TMP_WORD.setUint32(0, v, NATIVE_LITTLE_ENDIAN);
  return TMP_WORD.getFloat32(0, NATIVE_LITTLE_ENDIAN);
}

/**
 * Read a float64 value out of this segment.
 *
 * @param {number} byteOffset The offset in bytes from the start of the data section.
 * @param {Struct} s The struct to read from.
 * @param {DataView} [defaultMask] The default value as a DataView.
 * @returns {number} The value.
 */

export function getFloat64(byteOffset: number, s: Struct, defaultMask?: DataView): number {
  checkDataBounds(byteOffset, 8, s);

  const ds = getDataSection(s);

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
 * @param {Struct} s The struct to read from.
 * @param {DataView} [defaultMask] The default value as a DataView.
 * @returns {number} The value.
 */

export function getInt16(byteOffset: number, s: Struct, defaultMask?: DataView): number {
  checkDataBounds(byteOffset, 2, s);

  const ds = getDataSection(s);

  if (defaultMask === undefined) {
    return ds.segment.getInt16(ds.byteOffset + byteOffset);
  }

  const v = ds.segment.getUint16(ds.byteOffset + byteOffset) ^ defaultMask.getUint16(0, true);
  TMP_WORD.setUint16(0, v, NATIVE_LITTLE_ENDIAN);
  return TMP_WORD.getInt16(0, NATIVE_LITTLE_ENDIAN);
}

/**
 * Read an int32 value out of this segment.
 *
 * @param {number} byteOffset The offset in bytes from the start of the data section.
 * @param {Struct} s The struct to read from.
 * @param {DataView} [defaultMask] The default value as a DataView.
 * @returns {number} The value.
 */

export function getInt32(byteOffset: number, s: Struct, defaultMask?: DataView): number {
  checkDataBounds(byteOffset, 4, s);

  const ds = getDataSection(s);

  if (defaultMask === undefined) {
    return ds.segment.getInt32(ds.byteOffset + byteOffset);
  }

  const v = ds.segment.getUint32(ds.byteOffset + byteOffset) ^ defaultMask.getUint16(0, true);
  TMP_WORD.setUint32(0, v, NATIVE_LITTLE_ENDIAN);
  return TMP_WORD.getInt32(0, NATIVE_LITTLE_ENDIAN);
}

/**
 * Read an int64 value out of this segment.
 *
 * @param {number} byteOffset The offset in bytes from the start of the data section.
 * @param {Struct} s The struct to read from.
 * @param {DataView} [defaultMask] The default value as a DataView.
 * @returns {number} The value.
 */

export function getInt64(byteOffset: number, s: Struct, defaultMask?: DataView): Int64 {
  checkDataBounds(byteOffset, 8, s);

  const ds = getDataSection(s);

  if (defaultMask === undefined) {
    return ds.segment.getInt64(ds.byteOffset + byteOffset);
  }

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
 * @param {Struct} s The struct to read from.
 * @param {DataView} [defaultMask] The default value as a DataView.
 * @returns {number} The value.
 */

export function getInt8(byteOffset: number, s: Struct, defaultMask?: DataView): number {
  checkDataBounds(byteOffset, 1, s);

  const ds = getDataSection(s);

  if (defaultMask === undefined) {
    return ds.segment.getInt8(ds.byteOffset + byteOffset);
  }

  const v = ds.segment.getUint8(ds.byteOffset + byteOffset) ^ defaultMask.getUint8(0);
  TMP_WORD.setUint8(0, v);
  return TMP_WORD.getInt8(0);
}

export function getList<T>(index: number, ListClass: ListCtor<T>, s: Struct, defaultValue?: Pointer): List<T> {
  checkPointerBounds(index, s);

  const ps = getPointerSection(s);

  ps.byteOffset += index * 8;

  const l = new ListClass(ps.segment, ps.byteOffset, s._capnp.depthLimit - 1);

  if (isNull(l)) {
    if (defaultValue) {
      Pointer.copyFrom(defaultValue, l);
    } else {
      List.initList(ListClass._capnp.size, 0, l, ListClass._capnp.compositeSize);
    }
  } else if (ListClass._capnp.compositeSize !== undefined) {
    // If this is a composite list we need to be sure the composite elements are big enough to hold everything as
    // specified in the schema. If the new schema has added fields we'll need to "resize" (shallow-copy) the list so
    // it has room for the new fields.

    const srcSize = getTargetCompositeListSize(l);
    const dstSize = ListClass._capnp.compositeSize;

    if (dstSize.dataByteLength > srcSize.dataByteLength || dstSize.pointerLength > srcSize.pointerLength) {
      const srcContent = getContent(l);
      const srcLength = getTargetListLength(l);

      trace("resizing composite list %s due to protocol upgrade, new size: %d", l, getByteLength(dstSize) * srcLength);

      // Allocate an extra 8 bytes for the tag.
      const dstContent = l.segment.allocate(getByteLength(dstSize) * srcLength + 8);

      const res = initPointer(dstContent.segment, dstContent.byteOffset, l);

      setListPointer(res.offsetWords, ListClass._capnp.size, srcLength, res.pointer, dstSize);

      // Write the new tag word.

      setStructPointer(srcLength, dstSize, dstContent);

      // Seek ahead past the tag word before copying the content.
      dstContent.byteOffset += 8;

      for (let i = 0; i < srcLength; i++) {
        const srcElementOffset = srcContent.byteOffset + i * getByteLength(srcSize);
        const dstElementOffset = dstContent.byteOffset + i * getByteLength(dstSize);

        // Copy the data section.

        dstContent.segment.copyWords(dstElementOffset, srcContent.segment, srcElementOffset, getWordLength(srcSize));

        // Iterate through the pointers and update the offsets so they point to the right place.

        for (let j = 0; j < srcSize.pointerLength; j++) {
          const srcPtr = new Pointer(srcContent.segment, srcElementOffset + srcSize.dataByteLength + j * 8);
          const dstPtr = new Pointer(dstContent.segment, dstElementOffset + dstSize.dataByteLength + j * 8);

          const srcPtrTarget = followFars(srcPtr);
          const srcPtrContent = getContent(srcPtr);

          if (
            getTargetPointerType(srcPtr) === PointerType.LIST &&
            getTargetListElementSize(srcPtr) === ListElementSize.COMPOSITE
          ) {
            srcPtrContent.byteOffset -= 8;
          }

          const r = initPointer(srcPtrContent.segment, srcPtrContent.byteOffset, dstPtr);

          // Read the old pointer data, but discard the original offset.

          const a = srcPtrTarget.segment.getUint8(srcPtrTarget.byteOffset) & 0x03;
          const b = srcPtrTarget.segment.getUint32(srcPtrTarget.byteOffset + 4);

          r.pointer.segment.setUint32(r.pointer.byteOffset, a | (r.offsetWords << 2));
          r.pointer.segment.setUint32(r.pointer.byteOffset + 4, b);
        }
      }

      // Zero out the old content.

      srcContent.segment.fillZeroWords(srcContent.byteOffset, getWordLength(srcSize) * srcLength);
    }
  }

  return l;
}

export function getPointer(index: number, s: Struct): Pointer {
  checkPointerBounds(index, s);

  const ps = getPointerSection(s);

  ps.byteOffset += index * 8;

  return new Pointer(ps.segment, ps.byteOffset, s._capnp.depthLimit - 1);
}

export function getPointerAs<T extends Pointer>(index: number, PointerClass: PointerCtor<T>, s: Struct): T {
  checkPointerBounds(index, s);

  const ps = getPointerSection(s);

  ps.byteOffset += index * 8;

  return new PointerClass(ps.segment, ps.byteOffset, s._capnp.depthLimit - 1);
}

export function getPointerSection(s: Struct): Pointer {
  const ps = getContent(s);

  ps.byteOffset += padToWord(getSize(s).dataByteLength);

  return ps;
}

export function getSize(s: Struct): ObjectSize {
  if (s._capnp.compositeIndex !== undefined) {
    // For composite lists the object size is stored in a tag word right before the content.

    const c = getContent(s, true);

    c.byteOffset -= 8;

    return getStructSize(c);
  }

  return getTargetStructSize(s);
}

export function getStruct<T extends Struct>(
  index: number,
  StructClass: StructCtor<T>,
  s: Struct,
  defaultValue?: Pointer
): T {
  const t = getPointerAs(index, StructClass, s);

  if (isNull(t)) {
    if (defaultValue) {
      Pointer.copyFrom(defaultValue, t);
    } else {
      initStruct(StructClass._capnp.size, t);
    }
  } else {
    validate(PointerType.STRUCT, t);

    const ts = getTargetStructSize(t);

    // This can happen when reading a struct that was constructed with an older version of the same schema, and new
    // fields were added to the struct. A shallow copy of the struct will be made so that there's enough room for the
    // data and pointer sections. This will unfortunately leave a "hole" of zeroes in the message, but that hole will
    // at least compress well.
    if (
      ts.dataByteLength < StructClass._capnp.size.dataByteLength ||
      ts.pointerLength < StructClass._capnp.size.pointerLength
    ) {
      trace("need to resize child struct %s", t);

      resize(StructClass._capnp.size, t);
    }
  }

  return t;
}

export function getText(index: number, s: Struct, defaultValue?: string): string {
  const t = Text.fromPointer(getPointer(index, s));

  // FIXME: This will perform an unnecessary string<>ArrayBuffer roundtrip.
  if (isNull(t) && defaultValue) t.set(0, defaultValue);

  return t.get(0);
}

/**
 * Read an uint16 value out of a struct..
 *
 * @param {number} byteOffset The offset in bytes from the start of the data section.
 * @param {Struct} s The struct to read from.
 * @param {DataView} [defaultMask] The default value as a DataView.
 * @returns {number} The value.
 */

export function getUint16(byteOffset: number, s: Struct, defaultMask?: DataView): number {
  checkDataBounds(byteOffset, 2, s);

  const ds = getDataSection(s);

  if (defaultMask === undefined) {
    return ds.segment.getUint16(ds.byteOffset + byteOffset);
  }

  return ds.segment.getUint16(ds.byteOffset + byteOffset) ^ defaultMask.getUint16(0, true);
}

/**
 * Read an uint32 value out of a struct.
 *
 * @param {number} byteOffset The offset in bytes from the start of the data section.
 * @param {Struct} s The struct to read from.
 * @param {DataView} [defaultMask] The default value as a DataView.
 * @returns {number} The value.
 */

export function getUint32(byteOffset: number, s: Struct, defaultMask?: DataView): number {
  checkDataBounds(byteOffset, 4, s);

  const ds = getDataSection(s);

  if (defaultMask === undefined) {
    return ds.segment.getUint32(ds.byteOffset + byteOffset);
  }

  return ds.segment.getUint32(ds.byteOffset + byteOffset) ^ defaultMask.getUint32(0, true);
}

/**
 * Read an uint64 value out of a struct.
 *
 * @param {number} byteOffset The offset in bytes from the start of the data section.
 * @param {Struct} s The struct to read from.
 * @param {DataView} [defaultMask] The default value as a DataView.
 * @returns {number} The value.
 */

export function getUint64(byteOffset: number, s: Struct, defaultMask?: DataView): Uint64 {
  checkDataBounds(byteOffset, 8, s);

  const ds = getDataSection(s);

  if (defaultMask === undefined) {
    return ds.segment.getUint64(ds.byteOffset + byteOffset);
  }

  const lo = ds.segment.getUint32(ds.byteOffset + byteOffset) ^ defaultMask.getUint32(0, true);
  const hi = ds.segment.getUint32(ds.byteOffset + byteOffset + 4) ^ defaultMask.getUint32(4, true);
  TMP_WORD.setUint32(0, lo, NATIVE_LITTLE_ENDIAN);
  TMP_WORD.setUint32(4, hi, NATIVE_LITTLE_ENDIAN);
  return new Uint64(new Uint8Array(TMP_WORD.buffer.slice(0)));
}

/**
 * Read an uint8 value out of a struct.
 *
 * @param {number} byteOffset The offset in bytes from the start of the data section.
 * @param {Struct} s The struct to read from.
 * @param {DataView} [defaultMask] The default value as a DataView.
 * @returns {number} The value.
 */

export function getUint8(byteOffset: number, s: Struct, defaultMask?: DataView): number {
  checkDataBounds(byteOffset, 1, s);

  const ds = getDataSection(s);

  if (defaultMask === undefined) {
    return ds.segment.getUint8(ds.byteOffset + byteOffset);
  }

  return ds.segment.getUint8(ds.byteOffset + byteOffset) ^ defaultMask.getUint8(0);
}

export function getVoid(): void {
  throw new Error(INVARIANT_UNREACHABLE_CODE);
}

export function initData(index: number, length: number, s: Struct): Data {
  checkPointerBounds(index, s);

  const ps = getPointerSection(s);

  ps.byteOffset += index * 8;

  const l = new Data(ps.segment, ps.byteOffset, s._capnp.depthLimit - 1);

  erase(l);

  List.initList(ListElementSize.BYTE, length, l);

  return l;
}

export function initList<T>(index: number, ListClass: ListCtor<T>, length: number, s: Struct): List<T> {
  checkPointerBounds(index, s);

  const ps = getPointerSection(s);

  ps.byteOffset += index * 8;

  const l = new ListClass(ps.segment, ps.byteOffset, s._capnp.depthLimit - 1);

  erase(l);

  List.initList(ListClass._capnp.size, length, l, ListClass._capnp.compositeSize);

  return l;
}

/**
 * Write a boolean (bit) value to the struct.
 *
 * @protected
 * @param {number} bitOffset The offset in **bits** from the start of the data section.
 * @param {boolean} value The value to write (writes a 0 for `false`, 1 for `true`).
 * @param {Struct} s The struct to write to.
 * @param {DataView} [defaultMask] The default value as a DataView.
 * @returns {void}
 */

export function setBit(bitOffset: number, value: boolean, s: Struct, defaultMask?: DataView): void {
  const byteOffset = Math.floor(bitOffset / 8);
  const bitMask = 1 << bitOffset % 8;

  checkDataBounds(byteOffset, 1, s);

  const ds = getDataSection(s);

  const b = ds.segment.getUint8(ds.byteOffset + byteOffset);

  // If the default mask bit is set, that means `true` values are actually written as `0`.

  if (defaultMask !== undefined) {
    value = (defaultMask.getUint8(0) & bitMask) !== 0 ? !value : value;
  }

  ds.segment.setUint8(ds.byteOffset + byteOffset, value ? b | bitMask : b & ~bitMask);
}

/**
 * Write a primitive float32 value to the struct.
 *
 * @protected
 * @param {number} byteOffset The offset in bytes from the start of the data section.
 * @param {number} value The value to write.
 * @param {Struct} s The struct to write to.
 * @param {DataView} [defaultMask] The default value as a DataView.
 * @returns {void}
 */

export function setFloat32(byteOffset: number, value: number, s: Struct, defaultMask?: DataView): void {
  checkDataBounds(byteOffset, 4, s);

  const ds = getDataSection(s);

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
 * @param {Struct} s The struct to write to.
 * @param {DataView} [defaultMask] The default value as a DataView.
 * @returns {void}
 */

export function setFloat64(byteOffset: number, value: number, s: Struct, defaultMask?: DataView): void {
  checkDataBounds(byteOffset, 8, s);

  const ds = getDataSection(s);

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
 * @param {Struct} s The struct to write to.
 * @param {DataView} [defaultMask] The default value as a DataView.
 * @returns {void}
 */

export function setInt16(byteOffset: number, value: number, s: Struct, defaultMask?: DataView): void {
  checkDataBounds(byteOffset, 2, s);

  const ds = getDataSection(s);

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
 * @param {Struct} s The struct to write to.
 * @param {DataView} [defaultMask] The default value as a DataView.
 * @returns {void}
 */

export function setInt32(byteOffset: number, value: number, s: Struct, defaultMask?: DataView): void {
  checkDataBounds(byteOffset, 4, s);

  const ds = getDataSection(s);

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
 * @param {Struct} s The struct to write to.
 * @param {DataView} [defaultMask] The default value as a DataView.
 * @returns {void}
 */

export function setInt64(byteOffset: number, value: Int64, s: Struct, defaultMask?: DataView): void {
  checkDataBounds(byteOffset, 8, s);

  const ds = getDataSection(s);

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
 * @param {Struct} s The struct to write to.
 * @param {DataView} [defaultMask] The default value as a DataView.
 * @returns {void}
 */

export function setInt8(byteOffset: number, value: number, s: Struct, defaultMask?: DataView): void {
  checkDataBounds(byteOffset, 1, s);

  const ds = getDataSection(s);

  if (defaultMask !== undefined) {
    TMP_WORD.setInt8(0, value);
    const v = TMP_WORD.getUint8(0) ^ defaultMask.getUint8(0);
    ds.segment.setUint8(ds.byteOffset + byteOffset, v);

    return;
  }

  ds.segment.setInt8(ds.byteOffset + byteOffset, value);
}

export function setPointer(index: number, value: Pointer, s: Struct): void {
  copyFrom(value, getPointer(index, s));
}

export function setText(index: number, value: string, s: Struct): void {
  Text.fromPointer(getPointer(index, s)).set(0, value);
}

/**
 * Write a primitive uint16 value to the struct.
 *
 * @protected
 * @param {number} byteOffset The offset in bytes from the start of the data section.
 * @param {number} value The value to write.
 * @param {Struct} s The struct to write to.
 * @param {DataView} [defaultMask] The default value as a DataView.
 * @returns {void}
 */

export function setUint16(byteOffset: number, value: number, s: Struct, defaultMask?: DataView): void {
  checkDataBounds(byteOffset, 2, s);

  const ds = getDataSection(s);

  if (defaultMask !== undefined) value ^= defaultMask.getUint16(0, true);

  ds.segment.setUint16(ds.byteOffset + byteOffset, value);
}

/**
 * Write a primitive uint32 value to the struct.
 *
 * @protected
 * @param {number} byteOffset The offset in bytes from the start of the data section.
 * @param {number} value The value to write.
 * @param {Struct} s The struct to write to.
 * @param {DataView} [defaultMask] The default value as a DataView.
 * @returns {void}
 */

export function setUint32(byteOffset: number, value: number, s: Struct, defaultMask?: DataView): void {
  checkDataBounds(byteOffset, 4, s);

  const ds = getDataSection(s);

  if (defaultMask !== undefined) value ^= defaultMask.getUint32(0, true);

  ds.segment.setUint32(ds.byteOffset + byteOffset, value);
}

/**
 * Write a primitive uint64 value to the struct.
 *
 * @protected
 * @param {number} byteOffset The offset in bytes from the start of the data section.
 * @param {number} value The value to write.
 * @param {Struct} s The struct to write to.
 * @param {DataView} [defaultMask] The default value as a DataView.
 * @returns {void}
 */

export function setUint64(byteOffset: number, value: Uint64, s: Struct, defaultMask?: DataView): void {
  checkDataBounds(byteOffset, 8, s);

  const ds = getDataSection(s);

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
 * @param {Struct} s The struct to write to.
 * @param {DataView} [defaultMask] The default value as a DataView.
 * @returns {void}
 */

export function setUint8(byteOffset: number, value: number, s: Struct, defaultMask?: DataView): void {
  checkDataBounds(byteOffset, 1, s);

  const ds = getDataSection(s);

  if (defaultMask !== undefined) value ^= defaultMask.getUint8(0);

  ds.segment.setUint8(ds.byteOffset + byteOffset, value);
}

export function setVoid(): void {
  throw new Error(INVARIANT_UNREACHABLE_CODE);
}

export function testWhich(name: string, found: number, wanted: number, s: Struct): void {
  if (found !== wanted) {
    throw new Error(format(PTR_INVALID_UNION_ACCESS, s, name, found, wanted));
  }
}

export function checkDataBounds(byteOffset: number, byteLength: number, s: Struct): void {
  const dataByteLength = getSize(s).dataByteLength;

  if (byteOffset < 0 || byteLength < 0 || byteOffset + byteLength > dataByteLength) {
    throw new Error(format(PTR_STRUCT_DATA_OUT_OF_BOUNDS, s, byteLength, byteOffset, dataByteLength));
  }
}

export function checkPointerBounds(index: number, s: Struct): void {
  const pointerLength = getSize(s).pointerLength;

  if (index < 0 || index >= pointerLength) {
    throw new Error(format(PTR_STRUCT_POINTER_OUT_OF_BOUNDS, s, index, pointerLength));
  }
}
