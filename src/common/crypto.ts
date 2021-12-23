export const aesKeyGenParams = { name: "AES-GCM", length: 256 };
export const kRsaInBlockSize = 446;
export const kRsaOutBlockSize = 512;
export const kAesIvSize = 12;
export const kAesKeySize = 32;
export const kFormatVer1 = 1;
export const kWeaveboxApp = "weavebox.app";

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
  iv: Uint8Array,
  additionalText?: string
): Promise<Uint8Array> {
  let textEncoder = new TextEncoder();
  let additionalData = textEncoder.encode(additionalText ?? kWeaveboxApp);
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
  iv: Uint8Array,
  additionalText?: string
): Promise<Uint8Array> {
  let textEncoder = new TextEncoder();
  let additionalData = textEncoder.encode(additionalText ?? kWeaveboxApp);
  let decrypted = await window.crypto.subtle.decrypt(
    { name: "AES-GCM", iv, additionalData },
    key,
    ciphertext
  );
  return new Uint8Array(decrypted);
}

export function saveSessionData(data: string) {
  sessionStorage.setItem("keydata", data);
}

export function loadSessionData(): string | null {
  return sessionStorage.getItem("keydata");
}
