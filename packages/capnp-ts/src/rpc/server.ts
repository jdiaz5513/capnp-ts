/**
 * @author couchand
 */

import { NOT_IMPLEMENTED } from '../errors';
import { Pointer } from '../serialization';
import { format } from '../util';

import { CallContext } from './call-context';

export interface UnimplementedDispatchInterface {
  actualInterfaceName: string;
  requestedTypeId: string;
};

export interface UnimplementedDispatchMethod {
  interfaceName: string;
  typeId: string;
  methodId: number;
}

export interface UnimplementedUserMethod {
  interfaceName: string;
  methodName: string;
  typeId: string;
  methodId: number;
}

export class Capability_Server {

  internalUnimplemented(
    params: UnimplementedDispatchInterface | UnimplementedDispatchMethod | UnimplementedUserMethod
  ): Promise<void> {

    if (typeof (params as UnimplementedUserMethod).methodName !== 'undefined') {
      const { interfaceName, methodName, typeId, methodId } = params as UnimplementedUserMethod;
      throw new Error(format('Method not implemented. %s %s %s %d', interfaceName, methodName, typeId, methodId));
    }

    else if (typeof (params as UnimplementedDispatchMethod).methodId !== 'undefined') {
      const { interfaceName, typeId, methodId } = params as UnimplementedDispatchMethod;
      throw new Error(format('Method not implemented. %s %s %d', interfaceName, typeId, methodId));
    }

    else {
      const { actualInterfaceName, requestedTypeId } = params as UnimplementedDispatchInterface;
      throw new Error(format('Requested interface not implemented. %s %s', actualInterfaceName, requestedTypeId));
    }

  }

  internalGetTypedContext<Params, Results>(_context: CallContext<Pointer, Pointer>): CallContext<Params, Results> {

    throw new Error(format(NOT_IMPLEMENTED, 'Capability_Server::internalGetTypedContext'));

  }

}
