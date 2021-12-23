import { Dispatch, SetStateAction } from "react";
import { Account } from "./account";
import { b64Decode } from "./base64";
import { aesDecrypt, rsaDecrypt } from "./crypto";
import { ManifestData } from "./downloader";
import FileEntry, { ReadProgressReporter } from "./fileEntry";
import { msgUnpack } from "./msgpack";
import { arweave, getPrivateKey } from "./weave";

const aesKeyGenParams = { name: "AES-GCM", length: 256 };
const kRsaInBlockSize = 446;
const kRsaOutBlockSize = 512;
const kAesIvSize = 12;
const kAesKeySize = 32;
const kFormatVer1 = 1;

class Artifact {
  rootEntry: FileEntry;
  title: string = "";
  tags: string[] = [];
  memo: string = "";
  decrypted?: boolean;
  data?: Uint8Array;

  constructor(rootEntry?: FileEntry) {
    this.rootEntry = rootEntry ?? FileEntry.makeDirEntry();
  }

  public setRootFiles(files: File[]) {
    files.forEach((file) => this.rootEntry.addFile(file));
  }

  public async setRootHandle(handle: FileSystemHandle) {
    if (handle.kind === "directory") {
      for await (let h of handle.values()) {
        if (h.kind === "file") {
          await this.rootEntry.addHandle(h);
        }
      }
      for await (let h of handle.values()) {
        if (h.kind === "directory") {
          await this.rootEntry.addHandle(h);
        }
      }
    } else {
      let file = await handle.getFile();
      this.rootEntry.addFile(file);
    }
  }

  public async buildTransactionData(
    signal?: AbortSignal,
    readProgress?: ReadProgressReporter
  ): Promise<[any, Uint8Array]> {
    signal ??= new AbortController().signal;
    readProgress ??= () => {};
    let indexes = this.rootEntry.buildIndexArray(0);
    let contents = await this.rootEntry.loadData(signal, readProgress);
    return [indexes, contents];
  }

  loading = false;
  loadingPct = 0;
  manifest?: ManifestData;
  indexSize = 0;
  aesKey?: CryptoKey;
  aesSalt?: Uint8Array;

  async parseLeadingChunkData(manifest: ManifestData, account: Account) {
    this.manifest = manifest;

    let privateKey = await getPrivateKey(account);
    if (!privateKey) throw new Error("Key error");

    let { size, chunk } = manifest;
    let boot0 = chunk.subarray(0, kRsaOutBlockSize);

    let bootData = await rsaDecrypt(boot0, privateKey);
    let [[format, aesRawKey, aesSalt, indexSize], size0] = msgUnpack(bootData);

    if (format !== kFormatVer1) throw new Error("wrong format: " + format);
    if (!indexSize) throw new Error("wrong index size");

    let aesKey = await crypto.subtle.importKey(
      "raw",
      aesRawKey,
      aesKeyGenParams,
      false,
      ["decrypt"]
    );

    let indexData = chunk.subarray(
      kRsaOutBlockSize,
      kRsaOutBlockSize + indexSize
    );

    this.indexSize = indexSize;
    this.aesKey = aesKey;
    this.aesSalt = aesSalt;

    indexData = await aesDecrypt(indexData, aesKey, aesSalt);

    let res = msgUnpack(indexData);
    let [[title, tags, memo, rootIndex], _] = res;

    this.title = title;
    this.tags = tags;
    this.memo = memo;
    this.rootEntry.importIndexArray(rootIndex);

    if (chunk.length === size) {
      let data = chunk.subarray(kRsaOutBlockSize + indexSize, size);
      this.data = await aesDecrypt(data, aesKey, aesSalt);
    }

    this.decrypted = true;
  }

  async loadRemainChunks(setTick: Dispatch<SetStateAction<number>>) {
    if (this.loading || this.data) return;

    this.loading = true;

    let { chunk, offset, size } = this.manifest!;
    let buffer = new Uint8Array(size);
    buffer.set(chunk, 0);

    size -= chunk.length;

    let rpos = chunk.length;
    let rsize = 0;

    while (rsize < size) {
      let res = await arweave.api.get(`chunk/${offset}`);
      chunk = b64Decode(res.data.chunk as string);
      buffer.set(chunk, rpos + rsize);
      offset += chunk.length;
      rsize += chunk.length;
      this.loadingPct = Math.floor((rsize * 100) / size);
      setTick((x) => x + 1);
    }

    if (rsize !== size) throw new Error("size inconsistent");

    let data = buffer.subarray(
      kRsaOutBlockSize + this.indexSize,
      buffer.length
    );

    this.data = await aesDecrypt(data, this.aesKey!, this.aesSalt!);

    setTick((x) => x + 1);
    this.loading = false;
    this.loadingPct = 0;
  }
}

export default Artifact;
