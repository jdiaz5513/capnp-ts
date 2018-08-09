/**
 * Why would anyone **SANE** ever use this!?
 *
 * @author jdiaz5513
 */

import { ListCtor } from "./list";
import { PointerList } from "./pointer-list";
import { Void } from "./void";

export const VoidList: ListCtor<Void> = PointerList(Void);
