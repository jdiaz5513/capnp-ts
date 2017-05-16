const chunks: Buffer[] = [];

process.stdin.on('data', (chunk: Buffer) => {

  chunks.push(chunk);

});

process.stdin.on('finish', () => {

  const reqBuffer = new Buffer(chunks.reduce((l, chunk) => l + chunk.byteLength, -1));

  let i = 0;

  chunks.forEach((chunk, j) => {

    if (j === chunks.length - 1) {

      // Exclude the EOF byte.

      chunk.copy(reqBuffer, i, 0, chunk.byteLength - 1);

    } else {

      chunk.copy(reqBuffer, i);

    }

    i += chunk.byteLength;

  });

  console.log(reqBuffer);

});
