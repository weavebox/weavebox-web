import {
  decodeFromBase64,
  encodeToBase64,
  fromBase64Url,
  toBase64Url,
} from "./base64";
import { decodeFromUtf8, encodeToUtf8 } from "./utf8";
import Arweave from "arweave";

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

  let n = decodeFromBase64(fromBase64Url(jwk.n!));
  let a = await subtleCrypto.digest("SHA-256", n);
  let addr = toBase64Url(encodeToBase64(new Uint8Array(a)));

  return { jwk, addr };
}

export async function getAweaveAccountAddress(jwk: JsonWebKey) {
  let n = decodeFromBase64(fromBase64Url(jwk.n!));
  let a = await subtleCrypto.digest("SHA-256", n);
  return toBase64Url(encodeToBase64(new Uint8Array(a)));
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
  let b64: string = encodeToBase64(u8);
  let _u8: Uint8Array = decodeFromBase64(b64);
  let _str: string = decodeFromUtf8(_u8);
  let ok1 = str === _str;
  let ok2 = b64 === "aGVsbG/vvIzkvaDlpb0=";
  msg(`Origin string: ${str}, Decode string: ${_str}, ${ok1 ? "OK" : "BAD"}`);
  msg(`Encoded UTF8: ${u8}, Encoded base64: ${b64}, ${ok2 ? "OK" : "BAD"}`);
  return ok1 && ok2;
}

// Or to specify a gateway when running from NodeJS you might use
const arweave = Arweave.init({
  host: "arweave.net",
  port: 443,
  protocol: "https",
});

export const ArweaveApi = arweave.api;
