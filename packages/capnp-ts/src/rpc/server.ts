/**
 * @author couchand
 */

import { format } from '../util';

export class Capability_Server {

  internalUnimplemented(interfaceName: string, methodName: string, interfaceId: string, methodId: number): Promise<void> {

    throw new Error(format('Method not implemented. %s %s %s %d', interfaceName, methodName, interfaceId, methodId));

  }

}
