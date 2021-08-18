# @author jdiaz5513

@0xc81a48fa54bfdd1f;

struct Upgrade {

  legacyName @0 :Text;

  legacyId @1 :Int32;

  selfReference @2 :Upgrade;

  selfReferences @3 :List(Upgrade);

  newHotnessName @4 :Text;

  newHotnessId @5 :Int32;

}
