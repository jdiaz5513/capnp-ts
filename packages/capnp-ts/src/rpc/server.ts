/**
 * @author couchand
 */

import { NOT_IMPLEMENTED } from '../errors';
import { Pointer } from '../serialization';
import { format } from '../util';

import { CallContext } from './call-context';

export class Capability_Server {

  internalUnimplemented(interfaceName: string, methodNameOrInterfaceId?: string, interfaceIdOrMethodId?: string | number, methodId?: number): Promise<void> {

    if (typeof methodId !== 'undefined') {
      const methodName = methodNameOrInterfaceId;
      const interfaceId = interfaceIdOrMethodId as string;
      throw new Error(format('Method not implemented. %s %s %s %d', interfaceName, methodName, interfaceId, methodId));
    }

    else if (typeof interfaceIdOrMethodId !== 'undefined') {
      const interfaceId = methodNameOrInterfaceId;
      const methodId = interfaceIdOrMethodId as number;
      throw new Error(format('Method not implemented. %s %s %s %d', interfaceName, interfaceId, methodId));
    }

    else {
      const interfaceId = methodNameOrInterfaceId;
      throw new Error(format('Method not implemented. %s %s %s %d', interfaceName, interfaceId));
    }

  }

  internalGetTypedContext<Params, Results>(_context: CallContext<Pointer, Pointer>): CallContext<Params, Results> {

    throw new Error(format(NOT_IMPLEMENTED, 'Capability_Server::internalGetTypedContext'));

  }

}
