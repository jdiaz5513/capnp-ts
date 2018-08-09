import { ObjectSize } from '../../../lib';
import { tap } from '../../util';

tap.test('ObjectSize.toString()', (t) => {

  t.equals(new ObjectSize(8, 1).toString(), 'ObjectSize_dw:1,pc:1');

  t.end();

});
