#! /usr/bin/env bash
#
# Quick script that compiles and runs the samples, then cleans up.
# Used for release testing.

set -exuo pipefail

cd `dirname $0`

capnpc -o node_modules/.bin/capnpc-js addressbook.capnp
node addressbook.js write | node addressbook.js read
node addressbook.js dwrite | node addressbook.js dread
rm -f addressbook.capnp.js addressbook.capnp.ts

# Calculator example not yet implemented
# capnpc -oc++ calculator.capnp
# c++ -std=c++11 -Wall calculator-client.c++ calculator.capnp.c++ \
#     $(pkg-config --cflags --libs capnp-rpc) -o calculator-client
# c++ -std=c++11 -Wall calculator-server.c++ calculator.capnp.c++ \
#     $(pkg-config --cflags --libs capnp-rpc) -o calculator-server
# rm -f /tmp/capnp-calculator-example-$$
# ./calculator-server unix:/tmp/capnp-calculator-example-$$ &
# sleep 0.1
# ./calculator-client unix:/tmp/capnp-calculator-example-$$
# kill %+
# wait %+ || true
# rm calculator-client calculator-server calculator.capnp.c++ calculator.capnp.h /tmp/capnp-calculator-example-$$