#! /usr/bin/env bash
#
# Installs capnproto from a release tarball (because the versions in apt is too old)

set -exuo pipefail

capnp_version = 0.9.0

curl -O https://capnproto.org/capnproto-c++-${capnp_version}.tar.gz
tar zxf capnproto-c++-${capnp_version}.tar.gz
cd capnproto-c++-${capnp_version}
./configure --prefix=$HOME/opt
make -j6
make install
