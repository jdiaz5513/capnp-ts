/**
 * @author jdiaz5513
 */

import { MAX_DEPTH } from "../../constants";
import { NOT_IMPLEMENTED } from "../../errors";
import { format } from "../../util";
import { Segment } from "../segment";
import { Pointer } from "./pointer";

export class Interface extends Pointer {
  constructor(segment: Segment, byteOffset: number, depthLimit = MAX_DEPTH) {
    super(segment, byteOffset, depthLimit);

    throw new Error(format(NOT_IMPLEMENTED, "new Interface"));
  }
}
