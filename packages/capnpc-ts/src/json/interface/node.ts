import * as R from 'ramda';

import {c2t} from '../../util';
import {IField, INode, Node_Which} from '../types';
import {Slot} from './slot';

export const Node = {
  ANNOTATION: Node_Which.ANNOTATION,
  CONST: Node_Which.CONST,
  ENUM: Node_Which.ENUM,
  FILE: Node_Which.FILE,
  INTERFACE: Node_Which.INTERFACE,
  STRUCT: Node_Which.STRUCT,

  getDisplayNamePrefix(node: INode): string {

    return node.displayName.substr(node.displayNamePrefixLength);

  },

  getFullClassName(node: INode): string {

    return node.displayName.split(':')[1].split('.').map(c2t).join('_');

  },

  getUnnamedUnionFields(node: INode): IField[] {

    if (node.struct === undefined) return [];

    return R.filter((f) => f.discriminantValue !== Slot.NO_DISCRIMINANT, node.struct.fields);

  },

  which(node: INode): Node_Which {

    if (node.file !== undefined) return Node.FILE;
    if (node.struct !== undefined) return Node.STRUCT;
    if (node.enum !== undefined) return Node.ENUM;
    if (node.interface !== undefined) return Node.INTERFACE;
    if (node.const !== undefined) return Node.CONST;
    if (node.annotation !== undefined) return Node.ANNOTATION;

    throw new Error(`unknown union value for node: ${node}`);

  },

};
