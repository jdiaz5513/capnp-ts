import {Message, Pointer} from '../../../../lib';
import * as C from '../../../../lib/constants';
import {tap} from '../../../util';

/* tslint:disable no-any */

tap.test('new Pointer()', (t) => {

  const m = new Message();
  const s = m.getSegment(0);

  const initialTraversalLimit = (m as any)._traversalLimit as number;

  t.throws(() => {

    /* tslint:disable-next-line */
    new Pointer(s, 0, 0);

  }, undefined, 'should throw when exceeding the depth limit');

  const p = new Pointer(s, 4);

  t.equal((m as any)._traversalLimit, initialTraversalLimit - 8, 'should track pointer allocation in the message');

  t.throws(() => {

    /* tslint:disable-next-line */
    new Pointer(s, -1);

  }, undefined, 'should throw with a negative offset');

  t.throws(() => {

    /* tslint:disable-next-line */
    new Pointer(s, 100);

  }, undefined, 'should throw when exceeding segment bounds');

  t.equal(s.byteLength, 8);
  t.ok(new Pointer(s, 8), 'should allow creating pointers at the end of the segment');

  t.equal(p.segment, s);
  t.equal(p.byteOffset, 4);
  t.equal((p as any)._depthLimit, C.MAX_DEPTH);

  t.end();

});

tap.test('Pointer.adopt(), Pointer.disown()', (t) => {

  const m = new Message();
  const s = m.getSegment(0);
  const p = new Pointer(s, 0);

  // Empty bit list.
  s.setUint32(0, 0x00000001);
  s.setUint32(4, 0x00000001);

  const o = p.disown();

  t.equal(s.getUint32(0), 0x00000000);
  t.equal(s.getUint32(4), 0x00000000);

  p.adopt(o);

  t.equal(s.getUint32(0), 0x00000001);
  t.equal(s.getUint32(4), 0x00000001);

  t.end();

});

tap.test('Pointer.dump()', (t) => {

  const m = new Message();
  const s = m.getSegment(0);
  const p = new Pointer(s, 0);

  s.setUint32(0, 0x00000001);
  s.setUint32(4, 0x00000002);

  t.equal(p.dump(), '[01 00 00 00 02 00 00 00]');

  t.end();

});

tap.test('Pointer.toString()', (t) => {

  const m = new Message();
  const s = m.getSegment(0);
  const p = new Pointer(s, 0);

  s.setUint32(0, 0x00000001);
  s.setUint32(4, 0x00000002);

  t.equal(p.toString(), 'Pointer_0@0x00000000,[01 00 00 00 02 00 00 00],limit:0x7fffffff');

  t.end();

});
