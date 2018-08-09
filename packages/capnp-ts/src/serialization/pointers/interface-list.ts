/**
 * @author jdiaz5513
 */

import { Interface } from "./interface";
import { ListCtor } from "./list";
import { PointerList } from "./pointer-list";

export const InterfaceList: ListCtor<Interface> = PointerList(Interface);
