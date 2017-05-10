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

export function readFileBuffer(path: string): ArrayBuffer {

  const b = readFileSync(path);

  return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength);

}
