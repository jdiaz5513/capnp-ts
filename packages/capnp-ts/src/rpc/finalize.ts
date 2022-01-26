export type Finalize = (obj: unknown, finalizer: Finalizer) => void;
export type Finalizer = () => void;
