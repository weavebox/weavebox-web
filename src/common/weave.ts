import { b64Decode, b64Encode } from "./base64";
import { decodeFromUtf8, encodeToUtf8 } from "./utf8";
import Arweave from "arweave";
import { JWKInterface } from "arweave/web/lib/wallet";
import Transaction from "arweave/web/lib/transaction";

const subtleCrypto = window.crypto.subtle;

export async function generateArweaveAccountFast(): Promise<{
  jwk: JsonWebKey;
  addr: string;
}> {
  const genParams: RsaHashedKeyGenParams = {
    name: "RSA-PSS",
    modulusLength: 4096,
    publicExponent: new Uint8Array([0x01, 0x00, 0x01]),
    hash: { name: "SHA-256" },
  };

  const rsaKey: CryptoKeyPair = await subtleCrypto.generateKey(
    genParams,
    true,
    ["sign"]
  );

  let jwk = await subtleCrypto.exportKey("jwk", rsaKey.privateKey!);
  jwk = {
    kty: jwk.kty!, // Key Type
    e: jwk.e!, // RSA public exponent
    n: jwk.n!, // RSA modulus
    d: jwk.d, // RSA private exponent
    p: jwk.p, // RSA secret prime
    q: jwk.q, // RSA secret prime
    dp: jwk.dp, // RSA private key parameter
    dq: jwk.dq, // RSA private key parameter
    qi: jwk.qi, // RSA private key parameter
  };

  let n = b64Decode(jwk.n!);
  let a = await subtleCrypto.digest("SHA-256", n);
  let addr = b64Encode(a, true);

  return { jwk, addr };
}

export async function getAweaveAccountAddress(jwk: JsonWebKey) {
  let n = b64Decode(jwk.n!);
  let a = await subtleCrypto.digest("SHA-256", n);
  return b64Encode(a, true);
}

export async function importAweaveAccount(jwk: JsonWebKey): Promise<CryptoKey> {
  return await subtleCrypto.importKey(
    "jwk",
    jwk,
    { name: "RSA-PSS", hash: { name: "SHA-256" } },
    true,
    ["sign"]
  );
}

export function TestBase64AndUtf8Utils(msg: (m: string) => void): boolean {
  let str: string = "hello，你好";
  let u8: Uint8Array = encodeToUtf8(str);
  let b64: string = b64Encode(u8);
  let _u8: Uint8Array = b64Decode(b64);
  let _str: string = decodeFromUtf8(_u8);
  let ok1 = str === _str;
  let ok2 = b64 === "aGVsbG/vvIzkvaDlpb0=";
  msg(`Origin string: ${str}, Decode string: ${_str}, ${ok1 ? "OK" : "BAD"}`);
  msg(`Encoded UTF8: ${u8}, Encoded base64: ${b64}, ${ok2 ? "OK" : "BAD"}`);
  return ok1 && ok2;
}

export async function getPublicKey(jwk: JWKInterface | JsonWebKey) {
  return await crypto.subtle.importKey(
    "jwk",
    {
      kty: "RSA",
      e: "AQAB",
      n: jwk.n,
      alg: "RSA-OAEP-256",
      ext: true,
    },
    {
      name: "RSA-OAEP",
      hash: { name: "SHA-256" },
    },
    false,
    ["encrypt"]
  );
}

export async function getPrivateKey(jwk: JWKInterface | JsonWebKey) {
  return await crypto.subtle.importKey(
    "jwk",
    {
      ...jwk,
      alg: "RSA-OAEP-256",
      ext: true,
    },
    {
      name: "RSA-OAEP",
      hash: { name: "SHA-256" },
    },
    false,
    ["decrypt"]
  );
}

export function simplyViewTransaction(tx: Transaction) {
  return {
    format: tx.format,
    id: tx.id,
    last_tx: tx.last_tx,
    owner: tx.owner,
    tags: tx.tags,
    target: tx.target,
    quantity: tx.quantity,
    // data: ArweaveUtils.bufferTob64Url(this.data),
    data_size: tx.data_size,
    data_root: tx.data_root,
    data_tree: tx.data_tree,
    reward: tx.reward,
    signature: tx.signature,
  };
}

// Or to specify a gateway when running from NodeJS you might use
// export const arweave = Arweave.init({
//   host: "localhost",
//   port: 1984,
//   protocol: "http",
// });

export const arweave = Arweave.init({});

// @ts-ignore
// window.arweave = arweave;

export const ArweaveApi = arweave.api;
