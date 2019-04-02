export type Finalize = (obj: Object, finalizer: Finalizer) => void;
export type Finalizer = () => void;

let _finalize: Finalize = defaultFinalize;
let triedWeak = false;

function defaultFinalize(obj: Object, finalizer: Finalizer) {
  try {
    _finalize = require("weak") as Finalize;
    _finalize(obj, finalizer);
  } catch (e) {
    triedWeak = true;
    throw new Error();
  }
}

export function setFinalize(finalize: Finalize) {
  _finalize = finalize;
}

export function finalize(obj: Object, finalizer: Finalizer) {
  _finalize(obj, finalizer);
}
