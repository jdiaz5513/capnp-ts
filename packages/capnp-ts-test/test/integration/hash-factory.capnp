@0xbba26a2caa3411e8;

interface HashFactory {
    newSha1 @0 () -> (hash :Hash);
}

interface Hash {
    write @0 (data :Data) -> ();
    sum @1 () -> (hash :Data);
}
