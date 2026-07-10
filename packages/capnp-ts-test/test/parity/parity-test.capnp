@0xb1b1b1b1b1b1b1b1;

# Subset of capnproto/capnproto's c++/src/capnp/test.capnp, trimmed to
# features capnp-ts supports. Used by the parity harness to validate byte
# compatibility against the C++ reference implementation.
#
# Run `capnp compile -ots` against this file to regenerate the .ts.

enum TestEnum {
  foo @0;
  bar @1;
  baz @2;
  qux @3;
  quux @4;
  corge @5;
  grault @6;
  garply @7;
}

struct TestAllTypes {
  voidField      @0  :Void;
  boolField      @1  :Bool;
  int8Field      @2  :Int8;
  int16Field     @3  :Int16;
  int32Field     @4  :Int32;
  int64Field     @5  :Int64;
  uInt8Field     @6  :UInt8;
  uInt16Field    @7  :UInt16;
  uInt32Field    @8  :UInt32;
  uInt64Field    @9  :UInt64;
  float32Field   @10 :Float32;
  float64Field   @11 :Float64;
  textField      @12 :Text;
  dataField      @13 :Data;
  structField    @14 :TestAllTypes;
  enumField      @15 :TestEnum;
  interfaceField @16 :Void;  # placeholder; interfaces not implemented in capnp-ts

  voidList      @17 :List(Void);
  boolList      @18 :List(Bool);
  int8List      @19 :List(Int8);
  int16List     @20 :List(Int16);
  int32List     @21 :List(Int32);
  int64List     @22 :List(Int64);
  uInt8List     @23 :List(UInt8);
  uInt16List    @24 :List(UInt16);
  uInt32List    @25 :List(UInt32);
  uInt64List    @26 :List(UInt64);
  float32List   @27 :List(Float32);
  float64List   @28 :List(Float64);
  textList      @29 :List(Text);
  dataList      @30 :List(Data);
  structList    @31 :List(TestAllTypes);
  enumList      @32 :List(TestEnum);
}
