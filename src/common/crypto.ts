import { b64Decode, b64Encode } from "./base64";

const additionalData = new TextEncoder().encode("weavebox.app");

export async function rsaEncrypt(
  data: Uint8Array,
  key: CryptoKey
): Promise<Uint8Array> {
  let ciphertext = await window.crypto.subtle.encrypt(
    { name: "RSA-OAEP" },
    key,
    data
  );
  return new Uint8Array(ciphertext);
}

export async function rsaDecrypt(
  ciphertext: Uint8Array,
  key: CryptoKey
): Promise<Uint8Array> {
  let decrypted = await crypto.subtle.decrypt("RSA-OAEP", key, ciphertext);
  return new Uint8Array(decrypted);
}

export async function aesEncrypt(
  data: Uint8Array,
  key: CryptoKey,
  iv: Uint8Array
): Promise<Uint8Array> {
  let ciphertext = await window.crypto.subtle.encrypt(
    { name: "AES-GCM", iv, additionalData },
    key,
    data
  );
  return new Uint8Array(ciphertext);
}

export async function aesDecrypt(
  ciphertext: Uint8Array,
  key: CryptoKey,
  iv: Uint8Array
): Promise<Uint8Array> {
  let decrypted = await window.crypto.subtle.decrypt(
    { name: "AES-GCM", iv, additionalData },
    key,
    ciphertext
  );
  return new Uint8Array(decrypted);
}

/**
 * https://docs.arweave.org/developers/server/http-api
 * Note: The total size of the names and values of Tags
 *  may not exceed 2048 bytes.
 */
const kIvLength = 12;
const kAesKeyLength = 32;
const kAesBuckResSize = 512;
const kAesBuckLmtSize = 446;
const kAesMaxBuckNumber = 2;

export async function createPackedTag(payload: Uint8Array, key: CryptoKey) {
  const needSize = payload.length + kIvLength + kAesKeyLength;
  const needBucks = Math.ceil(needSize / kAesBuckLmtSize);

  if (needBucks > kAesMaxBuckNumber) {
    throw new Error("ERROR: Payload too large!");
  }

  const iv = crypto.getRandomValues(new Uint8Array(12));
  const aesKey = await crypto.subtle.generateKey(
    {
      name: "AES-GCM",
      length: 256,
    },
    true,
    ["encrypt", "decrypt"]
  );

  const rawKey = await window.crypto.subtle.exportKey("raw", aesKey);
  const buffer = new Uint8Array(kIvLength + kAesKeyLength + payload.length);

  buffer.set(new Uint8Array(rawKey));
  buffer.set(iv, kAesKeyLength);
  buffer.set(payload, kIvLength + kAesKeyLength);

  const result = new Uint8Array(kAesBuckResSize * needBucks);

  for (let i = 0; i < needBucks; ++i) {
    let lmtPos = i * kAesBuckLmtSize;
    let dat = buffer.slice(lmtPos, lmtPos + kAesBuckLmtSize);
    dat = await rsaEncrypt(dat, key);
    result.set(dat, i * kAesBuckResSize);
  }

  const tags = [
    { name: "app", value: "WeaveBox" },
    { name: "b64", value: b64Encode(result, true) },
  ];

  return { iv, aesKey, tags };
}

export async function unpackTag(b64: string, key: CryptoKey) {
  const ciphertext = b64Decode(b64);
  const nBlock = ciphertext.length / kAesBuckResSize;

  let pos = 0;
  let payload = new Uint8Array(nBlock * kAesBuckLmtSize);

  for (let i = 0; i < nBlock; ++i) {
    let resPos = i * kAesBuckResSize;
    let dat = ciphertext.slice(resPos, resPos + kAesBuckResSize);
    dat = await rsaDecrypt(dat, key);
    payload.set(dat, pos);
    pos += dat.length;
  }

  let rawKey = payload.slice(0, kAesKeyLength);
  let iv = payload.slice(kAesKeyLength, kAesKeyLength + kIvLength);
  payload = payload.slice(kAesKeyLength + kIvLength, pos);

  let aesKey = await window.crypto.subtle.importKey(
    "raw",
    rawKey,
    { name: "AES-GCM" },
    true,
    ["encrypt", "decrypt"]
  );

  return { iv, aesKey, payload };
}
