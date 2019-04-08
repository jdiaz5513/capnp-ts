import { Method } from "./method";
import { Uint64 } from "../types";

interface InterfaceDefinition {
  // tslint:disable-next-line:no-any
  methods: Array<Method<any, any>>;
}

// Registry keeps track of all interfaces so calls
// can be dispatched properly.
export class Registry {
  static readonly interfaces: { [hexId: string]: InterfaceDefinition } = {};

  static register(id: Uint64, def: InterfaceDefinition) {
    this.registerHex(id.toHexString(), def);
  }

  static registerHex(hexId: string, def: InterfaceDefinition) {
    this.interfaces[hexId] = def;
  }

  static lookup(id: Uint64): InterfaceDefinition | null {
    return this.lookupHex(id.toHexString());
  }

  static lookupHex(hexId: string): InterfaceDefinition | null {
    return this.interfaces[hexId];
  }
}
