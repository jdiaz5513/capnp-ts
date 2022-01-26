import { pad } from "capnp-ts/src/util";

// Yep, this is silly. :)

interface Hex2Dec {
  decToHex(d: string): string;
  hexToDec(h: string): string;
}

/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable @typescript-eslint/unbound-method */
const { decToHex, hexToDec } = require("hex2dec") as Hex2Dec;
/* eslint-enable */

export function c2s(s: string): string {
  return splitCamel(s)
    .map((x) => x.toUpperCase())
    .join("_");
}

export function c2t(s: string): string {
  return s.substr(0, 1).toUpperCase() + s.substr(1);
}

export function d2h(d: string): string {
  let h = decToHex(d).substr(2);
  let neg = false;

  if (h[0] === "-") {
    h = h.substr(1);

    neg = true;
  }

  return neg ? `-${pad(h, 16)}` : pad(h, 16);
}

export function decToHexBytes(d: string): string[] {
  let h = d2h(d);
  const neg = h[0] === "-";
  const out = neg ? ["-"] : [];

  if (neg) h = h.substr(1);

  for (let i = 0; i < h.length; i += 2) {
    out.push(h.substr(i, 2));
  }

  return out;
}

export function splitCamel(s: string): string[] {
  let wasLo = false;

  return s.split("").reduce((a: string[], c: string) => {
    const lo = c.toUpperCase() !== c;
    const up = c.toLowerCase() !== c;

    if (a.length === 0 || (wasLo && up)) {
      a.push(c);
    } else {
      const i = a.length - 1;
      a[i] = a[i] + c;
    }

    wasLo = lo;

    return a;
  }, []);
}

export function hexToBigInt(h: string): bigint {
  return BigInt(hexToDec(h));
}
