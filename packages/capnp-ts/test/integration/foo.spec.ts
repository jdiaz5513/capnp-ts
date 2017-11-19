import { tap } from '../util';
import * as capnp from '../../lib';

import { Foo as OldFoo } from './foo.capnp';
import { Foo as NewFoo } from './foo-new.capnp';

tap.test('foo regression', (t) => {

  const oldMessage = new capnp.Message();
  const oldFoo = oldMessage.initRoot(OldFoo);

  oldFoo.setBar('bar');

  const packed = Buffer.from(oldMessage.toPackedArrayBuffer());

  console.log(packed.toString('base64'));

  const newMessage = new capnp.Message(packed);
  console.log(newMessage.dump());
  const newFoo = newMessage.getRoot(NewFoo);

  console.log(newFoo.getBar());

  t.pass('should not 💩 the 🛏');

  t.end();

});
