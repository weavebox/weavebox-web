import { Dispatch, SetStateAction } from "react";
import { b64Decode } from "./base64";
import { arweave } from "./weave";
import { localdb } from "./localdb";

export const kWbStartupBlock = 836600;
export const kAdressLength = 43;

export type ManifestData = {
  id: string;
  size: number;
  offset: number;
  timestamp: number;
  height: number;
  chunk: Uint8Array;
};

const queryTemplate = `
{
  transactions(
    sort: HEIGHT_DESC
    first: 100
    after: "CURSOR"
    block: { min: MIN_HEIGHT, max: MAX_HEIGHT }
    owners: ["ADDRESS"]
    # tags: [{ name: "app", values: ["weavebox-v0"] }]
  ) {
    pageInfo {
      hasNextPage
    }
    edges {
      cursor
      node {
        id
        block {
          timestamp
          height
        }
      }
    }
  }
}`;

export function lastSyncHeightCacheKey(address: string) {
  return `wb-${address}-lastSyncHeight`;
}

// Those data should be cached in the localStorage
export async function syncManifestList(
  setter: Dispatch<SetStateAction<ManifestData[]>>,
  address: string,
  abSignal: AbortSignal
) {
  if (address.length !== kAdressLength) {
    throw new Error("Invalid address: " + address);
  }

  let cached = await localdb
    .table("artifacts")
    .where("address")
    .equals(address)
    .toArray();

  cached = cached.sort((m1, m2) => m2.timestamp - m1.timestamp);
  if (cached.length > 0) setter(cached);

  let t0 = performance.now();
  let fromHeight = kWbStartupBlock;

  let { data: info } = await arweave.api.get("info");
  let toHeight = Number(info.height);

  if (!info.current || toHeight < kWbStartupBlock) {
    throw new Error("Fail to get network info");
  }

  if (abSignal.aborted) return [];

  try {
    let lastSyncHeight = localStorage.getItem(lastSyncHeightCacheKey(address));
    if (!!lastSyncHeight) {
      // Arweave GraphQL may report transaction delayly,
      //  so always search back 10 blocks.
      fromHeight = Number(lastSyncHeight) - 10;
    }
    // console.log(`cache for ${address}`, lastSyncHeight, cached);
  } catch (err) {
    console.error(`Fail to load cache for ${address}`);
  }

  if (fromHeight >= toHeight) {
    // cache latest height
    localStorage.setItem(lastSyncHeightCacheKey(address), `${toHeight}`);
    console.log("skipping tx refresh");
    return;
  }

  try {
    let cursor = "";
    let txids = [] as { id: string; timestamp: number; height: number }[];

    do {
      let query = queryTemplate
        .replace(/MIN_HEIGHT/, `${fromHeight}`)
        .replace(/MAX_HEIGHT/, `${toHeight}`)
        .replace(/CURSOR/, cursor)
        .replace(/ADDRESS/, address);
      let res = await arweave.api.post("/graphql", { query });
      let { pageInfo, edges } = res.data.data.transactions;

      if (abSignal.aborted) return [];

      // console.log(query, res);

      if (edges && edges.length > 0) {
        let ids = edges.map((e: any) => ({
          id: e.node.id,
          timestamp: Number(e.node.block?.timestamp),
          height: Number(e.node.block?.height),
        }));
        txids = txids.concat(ids);
      }

      cursor = pageInfo.hasNextPage
        ? edges.reduce((c: any, e: any) => e.cursor, "")
        : null;
    } while (!!cursor);

    let len = txids.length;
    let result: ManifestData[] = [];

    for (let i = 0; i < len; ++i) {
      let { id, timestamp, height } = txids[i];

      // Already cached item
      if (cached.filter((r) => r.id === id).length > 0) {
        console.log("skip cached tx: " + id);
        continue;
      }

      let {
        data: { offset, size },
      } = await arweave.api.get(`tx/${id}/offset`);

      size = +size;

      if (abSignal.aborted) return [];
      if (size < 512) throw new Error(`Fail to query tx id: ${id}`);

      offset = offset - size + 1;

      let res = await arweave.api.get(`chunk/${offset}`);
      let chunk = b64Decode(res.data.chunk as string);

      // console.log(offset, size, chunk);

      offset += chunk.length;
      // console.log(`read: ${chunk.length}/${size}, next read: ${offset}`);

      // Add one chunk more
      if (chunk.length < size) {
        res = await arweave.api.get(`chunk/${offset}`);
        let chunk2 = b64Decode(res.data.chunk as string);
        offset += chunk2.length;

        // console.log(offset, size, chunk2);

        let chunk1 = chunk;
        chunk = new Uint8Array(chunk1.length + chunk2.length);
        chunk.set(chunk1);
        chunk.set(chunk2, chunk1.length);
      }

      result.push({ id, offset, size, chunk, timestamp, height });

      await localdb
        .table("artifacts")
        .put({ id, address, timestamp, offset, size, height, chunk });

      setter(result.concat(cached));
    }

    let t1 = performance.now();

    console.log(
      `sync height: ${fromHeight}~${toHeight}, ellapsed: ${t1 - t0}ms`
    );

    localStorage.setItem(lastSyncHeightCacheKey(address), `${toHeight}`);

    if (result.length > 0) {
      result = result.concat(cached);
      // console.log("final result: ", result);
    }
  } catch (err) {
    console.error(`network error ${err}`);
  }
}
