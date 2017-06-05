import {Message} from '../../../lib';
import {compareBuffers, readFileBuffer, tap} from '../../util';

const SEGMENTED_UNPACKED = readFileBuffer('test/data/segmented.bin');

tap.test('Message.fromArrayBuffer()', (t) => {

  const message = Message.fromArrayBuffer(SEGMENTED_UNPACKED);

  compareBuffers(t, message.toArrayBuffer(), SEGMENTED_UNPACKED);

  t.end();

});
