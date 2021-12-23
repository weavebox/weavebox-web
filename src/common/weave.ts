import { b64Decode, b64Encode } from "./base64";
import { decodeFromUtf8, encodeToUtf8 } from "./utf8";
import Arweave from "arweave";
import Transaction from "arweave/web/lib/transaction";
import { Account } from "./account";
import { aesDecrypt, aesKeyGenParams, loadSessionData } from "./crypto";
import { msgUnpack } from "./msgpack";
import { JWKInterface } from "arweave/node/lib/wallet";

const subtleCrypto = window.crypto.subtle;
const kAddressSize = 43;

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

export function invalidateAweaveAddress(address: string) {
  if (address.length === kAddressSize) return;
  throw new Error("invalid address: " + address);
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

export async function getSessionKey(
  account: Account
): Promise<JWKInterface | undefined> {
  let sessionData = loadSessionData();
  if (!sessionData || !sessionData.length) {
    return undefined;
  }

  let [unpacked] = msgUnpack(b64Decode(sessionData));
  let [address, sessionRawKey, sessionSalt, encryptedKey] = unpacked;
  if (account.address !== address) return undefined;

  let sessionKey = await crypto.subtle.importKey(
    "raw",
    sessionRawKey,
    aesKeyGenParams,
    false,
    ["decrypt"]
  );

  let decryptedData = await aesDecrypt(
    encryptedKey,
    sessionKey,
    sessionSalt,
    account.address
  );

  let textDecoder = new TextDecoder();
  let jwkJson = textDecoder.decode(decryptedData);

  return JSON.parse(jwkJson);
}

export async function getPublicKey(
  account: Account
): Promise<CryptoKey | undefined> {
  let jwk = await getSessionKey(account);
  if (!jwk) return undefined;
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

export async function getPrivateKey(
  account: Account
): Promise<CryptoKey | undefined> {
  let jwk = await getSessionKey(account);
  if (!jwk) return undefined;
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
