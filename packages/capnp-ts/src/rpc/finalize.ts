import { RPC_NO_FINALIZE_RUNTIME } from "../errors";

export type Finalize = (obj: Object, finalizer: Finalizer) => void;
export type Finalizer = () => void;

let _finalize: Finalize = defaultFinalize;

function defaultFinalize(_obj: Object, _finalizer: Finalizer) {
  throw new Error(RPC_NO_FINALIZE_RUNTIME);
}

export function setFinalize(finalize: Finalize) {
  _finalize = finalize;
}

export function finalize(obj: Object, finalizer: Finalizer) {
  _finalize(obj, finalizer);
}
