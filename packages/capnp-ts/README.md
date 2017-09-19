# capnp-ts

A strongly typed [Cap'n Proto](https://capnproto.org/) implementation for the browser and Node.js using TypeScript.

Here's a quick usage example:

```typescript
import * as capnp from 'capnp-ts';

import {MyStruct} from './myschema.capnp';

export function loadMessage(buffer: ArrayBuffer): MyStruct {

  const message = capnp.Message.fromArrayBuffer(buffer);

  return message.getRoot(MyStruct);

}
```

An extended readme is available on the project site: [https://github.com/jdiaz5513/capnp-ts](https://github.com/jdiaz5513/capnp-ts).
