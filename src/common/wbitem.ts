import { pack, unpack } from "msgpackr";
import { uint16Read, uint16Write } from "./base64";
import { aesDecrypt, aesEncrypt, rsaDecrypt, rsaEncrypt } from "./crypto";
import { ManifestData } from "./downloader";

const aesKeyGenParams = { name: "AES-GCM", length: 256 };
const kRsaInBlockSize = 446;
const kRsaOutBlockSize = 512;
const kAesIvSize = 12;
const kAesKeySize = 32;

export type WbFile = {
  name: string;
  offset: number;
  size: number;
  view?: Uint8Array;
};

export class WbItem {
  title: string = "";
  files: WbFile[] = [];
  tags: string[] = [];
  memo: string = "";
  data?: Uint8Array;
  iv?: Uint8Array;
  aesKey?: CryptoKey;
  rawBuffer?: Uint8Array;
  manifest?: ManifestData;

  async encryptData(fileList: File[], contents: Uint8Array, rsaKey: CryptoKey) {
    if (!fileList) throw new Error("encrypt data: no input file list");
    if (!contents) throw new Error("encrypt data: no input content");
    if (!rsaKey) throw new Error("encrypt data: no input rsa key");

    let encryptedManifest = await this.encryptManifest(fileList, rsaKey);
    let encryptedContents = await aesEncrypt(contents, this.aesKey!, this.iv!);

    let twoBytes = 2;
    let mlen = encryptedManifest.length;
    let clen = encryptedContents.length;
    let finalResult = new Uint8Array(mlen + clen + twoBytes);

    uint16Write(mlen, finalResult, 0);
    finalResult.set(encryptedManifest, twoBytes);
    finalResult.set(encryptedContents, mlen + twoBytes);

    return finalResult;
  }

  async encryptManifest(fileList: File[], rsaKey: CryptoKey) {
    let { title, tags, memo } = this;
    let files = fileList.map((f) => [f.name, f.size]);
    let extra = pack({ title, tags, memo, files }) as Uint8Array;

    this.iv = crypto.getRandomValues(new Uint8Array(kAesIvSize));
    this.aesKey = await crypto.subtle.generateKey(aesKeyGenParams, true, [
      "encrypt",
      "decrypt",
    ]);

    let rawKey = await crypto.subtle.exportKey("raw", this.aesKey);
    let encryptBuffer = new Uint8Array(
      kAesKeySize + kAesIvSize + 2 + extra.length
    );

    encryptBuffer.set(new Uint8Array(rawKey));
    encryptBuffer.set(this.iv, kAesKeySize);
    uint16Write(extra.length, encryptBuffer, kAesKeySize + kAesIvSize);
    encryptBuffer.set(extra, kAesKeySize + kAesIvSize + 2);

    let obuf = await rsaEncrypt(
      encryptBuffer.subarray(0, kRsaInBlockSize),
      rsaKey
    );

    if (encryptBuffer.length > kRsaInBlockSize) {
      let buf2 = await aesEncrypt(
        encryptBuffer.subarray(kRsaInBlockSize),
        this.aesKey,
        this.iv
      );
      let buf1 = obuf;
      obuf = new Uint8Array(buf1.length + buf2.length);
      obuf.set(buf1);
      obuf.set(buf2, buf1.length);
    }

    return obuf;
  }

  async decryptManifest(ibuf: Uint8Array, rsaKey: CryptoKey) {
    if (!this.manifest) {
      throw new Error("manifest data not exists yet!");
    }

    let encryptedManifestLength = uint16Read(ibuf, 0);
    let twoBytes = 2;
    let rsaEncrypted = await rsaDecrypt(
      ibuf.subarray(twoBytes, twoBytes + kRsaOutBlockSize),
      rsaKey
    );
    let rawKey = rsaEncrypted.subarray(0, kAesKeySize);

    this.iv = rsaEncrypted.subarray(kAesKeySize, kAesKeySize + kAesIvSize);
    this.aesKey = await crypto.subtle.importKey(
      "raw",
      rawKey,
      aesKeyGenParams,
      false,
      ["decrypt"]
    );

    let varifyLength = uint16Read(rsaEncrypted, kAesKeySize + kAesIvSize);
    let extra = rsaEncrypted.subarray(kAesKeySize + kAesIvSize + 2);

    if (
      extra.length !== varifyLength &&
      encryptedManifestLength > kRsaOutBlockSize
    ) {
      let more = await aesDecrypt(
        ibuf.subarray(
          twoBytes + kRsaOutBlockSize,
          twoBytes + encryptedManifestLength
        ),
        this.aesKey,
        this.iv
      );
      let temp = extra;
      if (extra.length + more.length === varifyLength) {
        extra = new Uint8Array(extra.length + more.length);
        extra.set(temp);
        extra.set(more, temp.length);
      }
    }

    if (extra.length !== varifyLength) throw new Error("Invalid TxTag");

    let { title, memo, files, tags } = unpack(extra);

    this.title = title;
    this.memo = memo;
    this.tags = tags;
    this.files = [];

    let dataSize = Number(this.manifest.size);
    let manifestSize = twoBytes + encryptedManifestLength;

    this.rawBuffer = ibuf.subarray(manifestSize);

    console.log(manifestSize, dataSize, ibuf.length);

    if (dataSize < ibuf.length) {
      console.error("This should be an parse error!");
      throw new Error("Inconsistent");
    } else if (dataSize > ibuf.length) {
      // Has more chunks of data to be downloaded,
      //  delay until user need it.
      console.log("more chunk data needed");
    } else {
      this.data = await aesDecrypt(this.rawBuffer, this.aesKey, this.iv);
    }

    let offset = 0;
    for (let i = 0; i < files.length; ++i) {
      let [name, size] = files[i];
      let view = this.data
        ? new Uint8Array(this.data.buffer, offset, size)
        : undefined;
      this.files.push({ name, size, offset, view });
      offset += size;
    }
  }
}
