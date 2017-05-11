import {Suite} from 'benchmark';
import {readFileSync} from 'fs';

import {pad} from '../../lib/util';
import {Test} from './tap';

export {default as tap} from './tap';

export function compareBuffers(parentTest: Test, found: ArrayBuffer, wanted: ArrayBuffer): Promise<Test> {

  return parentTest.test('compare buffers', (t) => {

    t.equal(found.byteLength, wanted.byteLength, 'should have the same byte length');

    // End the comparison prematurely if the buffer lengths differ.

    if (found.byteLength !== wanted.byteLength) return t.end();

    const a = new Uint8Array(found);
    const b = new Uint8Array(wanted);

    for (let i = 0; i < a.byteLength; i++) {

      if (a[i] !== b[i]) {

        t.fail(`bytes are not equal at offset 0x${pad(i.toString(16), 8)} (found: ${pad(a[i].toString(16), 2)}, ` +
               `wanted: ${pad(b[i].toString(16), 2)})`);

        // Don't bother checking the rest.

        t.end();

        return;

      }

    }

    t.end();

  });

}

export function logBench(suite: Suite) {

  // LINT: This is benchmark code, not library code.
  /* tslint:disable:no-console only-arrow-functions no-invalid-this */

  return suite.on('start', function() {

    console.log(`\nStarting benchmark: ${this.name}`);

  }).on('cycle', (ev) => {

    console.log(String(ev.target));

  }).on('complete', function() {

    const name = this.name as string;
    const fastest = this.filter('fastest');
    const slowest = this.filter('slowest');
    const ratio = fastest.map('hz') / slowest.map('hz');
    console.log(`Fastest ${name} is ${fastest.map('name')} (${ratio.toFixed(3)}x faster)`);

  });

  /* tslint:enable:no-console only-arrow-functions no-invalid-this */

}

export function readFileBuffer(path: string): ArrayBuffer {

  const b = readFileSync(path);

  return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength);

}
