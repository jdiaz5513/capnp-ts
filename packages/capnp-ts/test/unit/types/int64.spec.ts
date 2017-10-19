import {gen, property} from 'testcheck';

import {Int64} from '../../../lib/types/int64';
import {runTestCheck, tap} from '../../util';

tap.test('Int64.fromNumber().toNumber()', (t) => {

  runTestCheck(
    t, property(
      gen.intWithin(Number.MIN_SAFE_INTEGER, Number.MAX_SAFE_INTEGER), (x) => Int64.fromNumber(x).toNumber() === x),
    {numTests: 1000});

  t.end();

});
