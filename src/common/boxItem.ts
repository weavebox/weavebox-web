import { pack, unpack } from "msgpackr";
import {
  b64Decode,
  b64Encode,
  hexViewOf,
  uint16Read,
  uint16Write,
} from "./base64";
import { aesDecrypt, aesEncrypt, rsaDecrypt, rsaEncrypt } from "./crypto";

const aesKeyGenParams = { name: "AES-GCM", length: 256 };
const kRsaInBlockSize = 446;
const kRsaOutBlockSize = 512;
const kAesIvSize = 12;
const kAesKeySize = 32;

export type BoxFile = {
  name: string;
  offset: number;
  size: number;
  view?: Uint8Array;
};

export class BoxItem {
  title: string = "";
  files: BoxFile[] = [];
  tags: string[] = [];
  memo: string = "";
  data?: Uint8Array;
  iv?: Uint8Array;
  aesKey?: CryptoKey;

  async encryptData() {
    if (!this.data) throw new Error("No data");
    if (!this.aesKey || !this.iv) throw new Error("Invalid aes key");
    return aesEncrypt(this.data, this.aesKey, this.iv);
  }

  async exportTxTag(rsaKey: CryptoKey) {
    let { title, tags, memo } = this;
    let files = this.files.map((f) => [f.name, f.size]);
    let extra = pack({ title, tags, memo, files }) as Uint8Array;

    this.iv = crypto.getRandomValues(new Uint8Array(12));
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
      console.log(hexViewOf(obuf));
    }

    return b64Encode(obuf, true);
  }

  async importTxTag(b64: string, rsaKey: CryptoKey) {
    let ibuf = b64Decode(b64);
    let dat = await rsaDecrypt(ibuf.subarray(0, kRsaOutBlockSize), rsaKey);
    let rawKey = dat.subarray(0, kAesKeySize);

    this.iv = dat.subarray(kAesKeySize, kAesKeySize + kAesIvSize);
    this.aesKey = await crypto.subtle.importKey(
      "raw",
      rawKey,
      aesKeyGenParams,
      false,
      ["decrypt", "encrypt"]
    );

    let varifyLength = uint16Read(dat, kAesKeySize + kAesIvSize);
    let extra = dat.subarray(kAesKeySize + kAesIvSize + 2);

    if (extra.length !== varifyLength && ibuf.length > kRsaOutBlockSize) {
      let more = await aesDecrypt(
        ibuf.subarray(kRsaOutBlockSize),
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

    if (extra.length !== varifyLength) throw new Error("Invalid TxTag.");

    let { title, memo, files, tags } = unpack(extra);

    this.title = title;
    this.memo = memo;
    this.tags = tags;
    this.files = [];
    let offset = 0;

    for (let i = 0; i < files.length; ++i) {
      let [name, size] = files[i];
      this.files.push({ name, size, offset });
      offset += size;
    }
  }
}
