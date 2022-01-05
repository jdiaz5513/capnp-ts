import Benchmark, { Suite } from "benchmark";
import { readFileSync } from "fs";
import * as path from "path";
import { check, CheckOptions, Property } from "testcheck";

import { dumpBuffer, format, pad } from "capnp-ts/src/util";
import { Test } from "tap";
import initTrace from "debug";

const trace = initTrace("capnp-ts-test:util");
const x = new Test();
type Test = typeof x;

function diffHex(found: ArrayBuffer, wanted: ArrayBuffer): string {
  const a = new Uint8Array(found);
  const b = new Uint8Array(wanted);

  for (let i = 0; i < a.byteLength && i < b.byteLength; i++) {
    if (a[i] !== b[i]) {
      trace(dumpBuffer(found));
      trace(dumpBuffer(wanted));
      return format("addr:%a,found:%s,wanted:%s", i, pad(a[i].toString(16), 2), pad(b[i].toString(16), 2));
    }
  }

  if (a.byteLength > b.byteLength) {
    return format("addr:%a,found:%s,wanted:EOF", b.byteLength, pad(a[b.byteLength].toString(16), 2));
  } else if (b.byteLength > a.byteLength) {
    return format("addr:%a,found:EOF,wanted:%s", a.byteLength, pad(b[a.byteLength].toString(16), 2));
  }

  return "equal";
}

export function compareBuffers(
  parentTest: Test,
  found: ArrayBuffer,
  wanted: ArrayBuffer,
  name = "should have the same buffer contents"
): void {
  void parentTest.test(name, (t) => {
    t.equal(found.byteLength, wanted.byteLength, `should have the same byte length (diff=${diffHex(found, wanted)}).`);

    // End the comparison prematurely if the buffer lengths differ.

    if (found.byteLength !== wanted.byteLength) {
      t.end();

      return;
    }

    const a = new Uint8Array(found);
    const b = new Uint8Array(wanted);

    for (let i = 0; i < a.byteLength; i++) {
      if (a[i] !== b[i]) {
        t.fail(`bytes are not equal (${diffHex(found, wanted)})`);

        // Don't check any of the other bytes or else we might flood with failures.

        t.end();

        return;
      }
    }

    t.end();
  });
}

// LINT: This is benchmark code, not library code. This does not run as part of the test suite.
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/restrict-template-expressions */
/* eslint-disable @typescript-eslint/no-explicit-any */
export function logBench(suite: Suite): Suite {
  return suite

    .on("start", function (this: any) {
      console.log(`\nStarting benchmark: ${this.name}`);
    })

    .on("cycle", (ev: Benchmark.Event) => {
      console.log(String(ev.target));
    })

    .on("complete", function (this: any) {
      const name = this.name as string;
      const fastest = this.filter("fastest");
      const slowest = this.filter("slowest");
      const ratio = fastest.map("hz") / slowest.map("hz");
      console.log(`Fastest ${name} is ${fastest.map("name")} (${ratio.toFixed(3)}x faster)`);
    });
}
/* eslint-enable */

export function readFileBuffer(filePath: string): ArrayBuffer {
  const b = readFileSync(path.join(__dirname, "../../", filePath));

  return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength);
}

export function runTestCheck<TArgs>(
  parentTest: Test,
  property: Property<TArgs>,
  options?: CheckOptions,
  name = "should satisfy property check"
): void {
  void parentTest.test(name, (t) => {
    const out = check(property, options);

    t.equal(out.result, true, `property check failed ${JSON.stringify(out)}`);

    t.end();
  });
}
