import {
  chunkData,
  Chunk,
  MAX_CHUNK_SIZE,
  MIN_CHUNK_SIZE,
} from "arweave/web/lib/merkle";
import assert from "@stdlib/assert";
import Arweave from "arweave";
// import { encodeToBase64 } from "./base64";

/**
 * Takes the input data and chunks it into (mostly) equal sized chunks.
 * The last chunk will be a bit smaller as it contains the remainder
 * from the chunking process.
 */
async function myChunkData(data: Uint8Array): Promise<Chunk[]> {
  let chunks: Chunk[] = [];

  let restLength = data.byteLength;
  let cursor = 0;

  while (restLength >= MAX_CHUNK_SIZE) {
    let chunkSize = MAX_CHUNK_SIZE;

    // If the total bytes left will produce a chunk < MIN_CHUNK_SIZE,
    // then adjust the amount we put in this 2nd last chunk.

    let nextChunkSize = restLength - MAX_CHUNK_SIZE;
    if (nextChunkSize > 0 && nextChunkSize < MIN_CHUNK_SIZE) {
      chunkSize = Math.ceil(restLength / 2);
      // console.log(`Last chunk will be: ${nextChunkSize} which is below ${MIN_CHUNK_SIZE}, adjusting current to ${chunkSize} with ${rest.byteLength} left.`)
    }

    const dataHash = await Arweave.crypto.hash(
      new Uint8Array(data.buffer, cursor, chunkSize)
    );
    cursor += chunkSize;
    chunks.push({
      dataHash,
      minByteRange: cursor - chunkSize,
      maxByteRange: cursor,
    });
    restLength -= chunkSize;
  }

  chunks.push({
    dataHash: await Arweave.crypto.hash(new Uint8Array(data.buffer, cursor)),
    minByteRange: cursor,
    maxByteRange: cursor + restLength,
  });

  return chunks;
}

export async function compareChunkDataFunc() {
  // 200MB datasize
  let data = new Uint8Array(1024 * 1024 * 200 + 10);
  data.set([1, 23, 4], 1024 * 924);
  data.set([1, 23, 4], 1024 * 1024 * 94);
  data.set([1, 23, 4], 1024 * 1024 * 200);
  let t0 = performance.now();
  let chunks = await chunkData(data);
  let t1 = performance.now();
  let myChunks = await myChunkData(data);
  let t2 = performance.now();
  let ok = assert.deepEqual(chunks, myChunks);

  // for (let i = 0; i < chunks.length; ++i) {
  //   console.log(
  //     `${encodeToBase64(chunks[i].dataHash)} ~~ ${encodeToBase64(
  //       myChunks[i].dataHash
  //     )} `
  //   );
  // }

  console.log(
    ok,
    `My chunkData(): ${t2 - t1}ms, Arweave chunkData(): ${t1 - t0}ms`
  );
}
