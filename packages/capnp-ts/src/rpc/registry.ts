import { Method } from "./method";

interface InterfaceDefinition {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  methods: Array<Method<any, any>>;
}

// Registry keeps track of all interfaces so calls
// can be dispatched properly.
export class Registry {
  static readonly interfaces: Map<bigint, InterfaceDefinition> = new Map();

  static register(id: bigint, def: InterfaceDefinition): void {
    this.interfaces.set(id, def);
  }

  static lookup(id: bigint): InterfaceDefinition | undefined {
    return this.interfaces.get(id);
  }
}
