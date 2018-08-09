import { Field_Which, IField } from "../types";

export const Field = {
  GROUP: Field_Which.GROUP,
  ORDINAL: Field_Which.ORDINAL,
  SLOT: Field_Which.SLOT,

  needsConcreteListClass(field: IField) {
    return !!(
      field.slot &&
      field.slot.type.list &&
      (field.slot.type.list.elementType.struct ||
        field.slot.type.list.elementType.list)
    );
  },

  which(field: IField): Field_Which {
    if (field.group !== undefined) return Field.GROUP;
    if (field.ordinal !== undefined) return Field.ORDINAL;
    if (field.slot !== undefined) return Field.SLOT;

    throw new Error(`unknown union value for field: ${field}`);
  }
};
