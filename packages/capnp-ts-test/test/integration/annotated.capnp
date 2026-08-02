@0xd4c9b12f83a7e654;

annotation tag @0xea88d419cd1a22c8 (file, struct, field) :Text;
annotation weight @0xb5f27ed23bfae214 (field) :UInt32;

$tag("file-note");

struct Widget $tag("widget") {
  name @0 :Text $tag("name") $weight(42);
  size @1 :UInt32;
}

# Applying the same annotation twice to one target is legal; metadata must preserve every application.

struct Crate $tag("first") $tag("second") {
  contents @0 :Text;
}
