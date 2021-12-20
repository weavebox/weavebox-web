import { Dispatch, SetStateAction } from "react";
import { arweave } from "./weave";

export const kWbStartupBlock = 800000;
export const kAdressLength = 43;

export type ManifestData = {
  id: string;
  size: number;
  offset: number;
  chunk: string;
  height: string;
  timestamp: string;
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

export function manifestListCacheKey(address: string) {
  return `wb-${address}-manifestList`;
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

  let result = [] as ManifestData[];
  let cached = localStorage.getItem(manifestListCacheKey(address));

  if (!!cached) {
    result = JSON.parse(cached) as ManifestData[];
    if (result.length > 0) setter(result);
  }

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

    console.log(`cache for ${address}`, lastSyncHeight, result);
  } catch (err) {
    console.error(`Fail to load cache for ${address}`);
  }

  if (fromHeight >= toHeight) {
    // cache latest height
    localStorage.setItem(lastSyncHeightCacheKey(address), `${toHeight}`);
    return;
  }

  try {
    let cursor = "";
    let txids = [] as any;

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
          timestamp: e.node.block?.timestamp,
          height: e.node.block?.height,
        }));
        txids = txids.concat(ids);
      }

      cursor = pageInfo.hasNextPage
        ? edges.reduce((c: any, e: any) => e.cursor, "")
        : null;
    } while (!!cursor);

    const len = txids.length;
    for (let i = 0; i < len; ++i) {
      let { id, timestamp, height } = txids[len - i - 1];

      // Already cached item
      if (result.filter((r) => r.id === id).length > 0) {
        console.log("skip cached tx: " + id);
        continue;
      }

      let {
        data: { offset, size },
      } = await arweave.api.get(`tx/${id}/offset`);

      if (abSignal.aborted) return [];

      if (size < 512) throw new Error(`Fail to query tx id: ${id}`);

      offset = offset - size + 1;

      let res = await arweave.api.get(`chunk/${offset}`);
      let chunk = res.data.chunk as string;

      result.unshift({ id, offset, size, chunk, timestamp, height });
      setter([...result]);
    }

    let t1 = performance.now();

    console.log(
      `sync height: ${fromHeight}~${toHeight}, ellapsed: ${t1 - t0}ms`
    );

    localStorage.setItem(lastSyncHeightCacheKey(address), `${toHeight}`);
    localStorage.setItem(manifestListCacheKey(address), JSON.stringify(result));
  } catch (err) {
    console.error(`network error`);
  }
}
