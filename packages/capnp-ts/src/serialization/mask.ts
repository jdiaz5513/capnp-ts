/**
 * @author jdiaz5513
 */

import {Int64, Uint64} from '../types';

type DataViewSetter = (byteOffset: number, value: number, littleEndian?: boolean) => void;

function _makePrimitiveMaskFn(byteLength: number, setter: DataViewSetter): (x: number) => DataView {

  return (x: number): DataView => {

    const dv = new DataView(new ArrayBuffer(byteLength));
    setter.call(dv, 0, x, true);
    return dv;

  };

}

/* tslint:disable:no-unsafe-any */

export const getFloat32Mask = _makePrimitiveMaskFn(4, DataView.prototype.setFloat32);

export const getFloat64Mask = _makePrimitiveMaskFn(8, DataView.prototype.setFloat64);

export const getInt16Mask = _makePrimitiveMaskFn(2, DataView.prototype.setInt16);

export const getInt32Mask = _makePrimitiveMaskFn(4, DataView.prototype.setInt32);

export const getInt8Mask = _makePrimitiveMaskFn(1, DataView.prototype.setInt8);

export const getUint16Mask = _makePrimitiveMaskFn(2, DataView.prototype.setUint16);

export const getUint32Mask = _makePrimitiveMaskFn(4, DataView.prototype.setUint32);

export const getUint8Mask = _makePrimitiveMaskFn(1, DataView.prototype.setUint8);

/* tslint:enable:no-unsafe-any */

export function getBitMask(value: boolean, bitOffset: number): DataView {

  const dv = new DataView(new ArrayBuffer(1));

  if (!value) return dv;

  dv.setUint8(0, 1 << bitOffset % 8);
  return dv;

}

export function getInt64Mask(x: Int64): DataView {

  return x.toDataView();

}

export function getUint64Mask(x: Uint64): DataView {

  return x.toDataView();

}
