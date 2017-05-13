import Benchmark, {Suite} from 'benchmark';
import {readFileSync} from 'fs';
import {check, CheckOptions, Property} from 'testcheck';

import {bufferToHex, pad} from '../../lib/util';
import {Test} from './tap';

export {default as tap} from './tap';

export async function compareBuffers(parentTest: Test, found: ArrayBuffer, wanted: ArrayBuffer): Promise<Test> {

  return parentTest.test('compare buffers', (t) => {

    t.equal(found.byteLength, wanted.byteLength, 'should have the same byte length');

    // End the comparison prematurely if the buffer lengths differ.

    if (found.byteLength !== wanted.byteLength) {

      t.end();

      return;

    }

    const a = new Uint8Array(found);
    const b = new Uint8Array(wanted);

    for (let i = 0; i < a.byteLength; i++) {

      if (a[i] !== b[i]) {

        t.fail(`bytes are not equal at offset 0x${pad(i.toString(16), 8)} (found: ${bufferToHex(found)}, wanted: ` +
               `${bufferToHex(wanted)})`);

        // Don't check any of the other bytes or else we might flood with failures.

        t.end();

        return;

      }

    }

    t.end();

  });

}

// LINT: This is benchmark code, not library code. This does not run as part of the test suite.
/* tslint:disable:no-any no-unsafe-any no-console only-arrow-functions no-invalid-this */
export function logBench(suite: Suite) {

  return suite

    .on('start', function(this: any) {

      console.log(`\nStarting benchmark: ${this.name}`);

    })

    .on('cycle', (ev: Benchmark.Event) => {

      console.log(String(ev.target));

    })

    .on('complete', function(this: any) {

      const name = this.name as string;
      const fastest = this.filter('fastest');
      const slowest = this.filter('slowest');
      const ratio = fastest.map('hz') / slowest.map('hz');
      console.log(`Fastest ${name} is ${fastest.map('name')} (${ratio.toFixed(3)}x faster)`);

    });

}
/* tslint:enable:no-any no-unsafe-any no-console only-arrow-functions no-invalid-this */

export function readFileBuffer(path: string): ArrayBuffer {

  const b = readFileSync(path);

  return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength);

}

export async function runTestCheck<TArgs>(parentTest: Test, property: Property<TArgs>,
                                          options?: CheckOptions): Promise<Test> {

  return parentTest.test('testcheck', (t) => {

    const out = check(property, options);

    t.equal(out.result, true, `property check failed ${JSON.stringify(out)}`);

    t.end();

  });

}
