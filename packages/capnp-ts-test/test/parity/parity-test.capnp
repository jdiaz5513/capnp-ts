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

struct TestDefaults {
  voidField      @0  :Void    = void;
  boolField      @1  :Bool    = true;
  int8Field      @2  :Int8    = -123;
  int16Field     @3  :Int16   = -12345;
  int32Field     @4  :Int32   = -12345678;
  int64Field     @5  :Int64   = -123456789012345;
  uInt8Field     @6  :UInt8   = 234;
  uInt16Field    @7  :UInt16  = 45678;
  uInt32Field    @8  :UInt32  = 3456789012;
  uInt64Field    @9  :UInt64  = 12345678901234567890;
  float32Field   @10 :Float32 = 1234.5;
  float64Field   @11 :Float64 = -123e45;
  textField      @12 :Text    = "foo";
  dataField      @13 :Data    = 0x"62 61 72";
  structField    @14 :TestAllTypes = (
      textField = "nested",
      structField = (textField = "really nested"),
      enumField = baz);
  enumField      @15 :TestEnum = corge;
  interfaceField @16 :Void;

  voidList      @17 :List(Void)    = [void, void, void];
  boolList      @18 :List(Bool)    = [true, false];
  int8List      @19 :List(Int8)    = [111, -111];
  int16List     @20 :List(Int16)   = [11111, -11111];
  int32List     @21 :List(Int32)   = [111111111, -111111111];
  int64List     @22 :List(Int64)   = [1111111111111111111, -1111111111111111111];
  uInt8List     @23 :List(UInt8)   = [111, 222];
  uInt16List    @24 :List(UInt16)  = [33333, 44444];
  uInt32List    @25 :List(UInt32)  = [3333333333];
  uInt64List    @26 :List(UInt64)  = [11111111111111111111];
  float32List   @27 :List(Float32) = [5555.5, inf, -inf, nan];
  float64List   @28 :List(Float64) = [7777.75, inf, -inf, nan];
  textList      @29 :List(Text)    = ["plugh", "xyzzy", "thud"];
  dataList      @30 :List(Data)    = ["oops", "exhausted", "rfc3092"];
  structList    @31 :List(TestAllTypes) = [
      (textField = "structlist 1"),
      (textField = "structlist 2"),
      (textField = "structlist 3")];
  enumList      @32 :List(TestEnum) = [foo, garply];
}
