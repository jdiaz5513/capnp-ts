import tap from '../util/tap';
import * as capnp from 'capnp-ts';
import { Foo } from './interface.capnp';

tap.test('interface generation', (t) => {
  t.ok(new Foo.Client() instanceof capnp.Capability_Client);
  t.ok(new Foo.Server() instanceof capnp.Capability_Server);

  t.end();
});
