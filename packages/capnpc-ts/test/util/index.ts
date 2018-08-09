export { default as tap } from './tap';
import { readFileSync } from 'fs';
import * as path from 'path';

export function readFileBuffer(filePath: string): ArrayBuffer {

  const b = readFileSync(path.join(__dirname, '../../', filePath));

  return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength);

}
