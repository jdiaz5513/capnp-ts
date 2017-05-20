/**
 * @author jdiaz5513
 */

import {Data} from './data';
import {ListCtor} from './list';
import {PointerList} from './pointer-list';

export const DataList: ListCtor<Data> = PointerList(Data);
