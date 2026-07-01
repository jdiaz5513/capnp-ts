import { pad } from "capnp-ts/src/util";
import initTrace from "debug";

const trace = initTrace("capnpc:util");
trace("load");

// hex2dec was a dependency that pre-dated native BigInt support. It's gone now;
// these helpers wrap the equivalent BigInt math so call sites don't change.

function decToHex(d: string): string {
  // Match the old hex2dec shape: "0x..." or "-0x..." for negatives.
  const n = BigInt(d);
  return n < 0n ? `-0x${(-n).toString(16)}` : `0x${n.toString(16)}`;
}

function hexToDec(h: string): string {
  // hex2dec was lenient about bare hex digits (no "0x" prefix). Keep that.
  const normalized = h.startsWith("0x") || h.startsWith("-0x") || h.startsWith("0X") || h.startsWith("-0X")
    ? h
    : `0x${h}`;
  return BigInt(normalized).toString();
}

export function c2s(s: string): string {
  return splitCamel(s)
    .map((x) => x.toUpperCase())
    .join("_");
}

export function c2t(s: string): string {
  return s.slice(0, 1).toUpperCase() + s.slice(1);
}

export function d2h(d: string): string {
  let h = decToHex(d).slice(2);
  let neg = false;

  if (h[0] === "-") {
    h = h.slice(1);

    neg = true;
  }

  return neg ? `-${pad(h, 16)}` : pad(h, 16);
}

export function decToHexBytes(d: string): string[] {
  let h = d2h(d);
  const neg = h[0] === "-";
  const out = neg ? ["-"] : [];

  if (neg) h = h.slice(1);

  for (let i = 0; i < h.length; i += 2) {
    out.push(h.slice(i, i + 2));
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
