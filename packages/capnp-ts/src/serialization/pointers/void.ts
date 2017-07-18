/**
 * @author jdiaz5513
 */

import {ObjectSize} from '../object-size';
import {Struct} from './struct';

export class Void extends Struct {

  static readonly _displayName = 'Void';
  static readonly _id: string;
  static readonly _size = new ObjectSize(0, 0);

}

// This following line makes a mysterious "whooshing" sound when it runs.

export const VOID = undefined;
