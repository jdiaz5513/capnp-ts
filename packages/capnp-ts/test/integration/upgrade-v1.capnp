# @author jdiaz5513

using TS = import "../../src/std/ts.capnp";

@0xc81a48fa54bfdd1f;
$TS.importPath("../../lib/index");

struct Upgrade {

  legacyName @0 :Text;

  legacyId @1 :Int32;

  selfReference @2 :Upgrade;

  selfReferences @3 :List(Upgrade);

}
