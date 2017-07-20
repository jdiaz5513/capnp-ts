#! /usr/bin/env bash
#
# Installs capnproto from a release tarball (because the versions in apt is too old)

set -exuo pipefail

curl -O https://capnproto.org/capnproto-c++-0.6.1.tar.gz
tar zxf capnproto-c++-0.6.1.tar.gz
cd capnproto-c++-0.6.1
./configure --prefix=$HOME/opt/bin
make -j6 check
make install
