/**
 * @author jdiaz5513
 */

import { ListCtor } from './list';
import { Pointer } from './pointer';
import { PointerList } from './pointer-list';

export const AnyPointerList: ListCtor<Pointer> = PointerList(Pointer);
