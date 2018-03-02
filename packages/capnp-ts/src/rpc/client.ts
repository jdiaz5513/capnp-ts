/**
 * @author couchand
 */

import { NOT_IMPLEMENTED } from '../errors';
import { format } from '../util';

import { Request } from './request';

export class Capability_Client {

  newCall<Params, Results>(_interfaceId: string, _methodId: number): Request<Params, Results> {

    throw new Error(format(NOT_IMPLEMENTED, 'Capability_Client::newCall'));

  }

}
