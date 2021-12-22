const alphabet =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

// @ts-ignore
const lookup = Object.fromEntries(
  Array.from(alphabet).map((a, i) => [a.charCodeAt(0), i])
);

lookup["=".charCodeAt(0)] = 0;
lookup["-".charCodeAt(0)] = 62;
lookup["_".charCodeAt(0)] = 63;

const encoder = new TextEncoder();
const decoder = new TextDecoder();

// @ts-ignore
const encodeLookup = Object.fromEntries(
  Array.from(alphabet).map((a, i) => [i, a.charCodeAt(0)])
);

// Convert base64Url to base64
export function b64UrlTob64(b64Url: string) {
  b64Url = b64Url.replace(/-/g, "+").replace(/_/g, "/");
  let padding = b64Url.length % 4;
  if (padding !== 0) padding = 4 - padding;
  return b64Url.concat("=".repeat(padding));
}

// Convert base64 to base64Url
export function b64Tob64Url(b64: string) {
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

// Decodes base64/base64Url to Uint8Array
export function b64Decode(b64: string) {
  b64 = b64.replace(/-/g, "+").replace(/_/g, "/").replace(/=/g, "");
  let n = b64.length;
  let rem = n % 4;
  let k = rem && rem - 1; // how many bytes the last base64 chunk encodes
  let m = (n >> 2) * 3 + k; // total encoded bytes

  let encoded = new Uint8Array(n + 3);
  encoder.encodeInto(b64 + "===", encoded);

  for (let i = 0, j = 0; i < n; i += 4, j += 3) {
    let x =
      (lookup[encoded[i]] << 18) +
      (lookup[encoded[i + 1]] << 12) +
      (lookup[encoded[i + 2]] << 6) +
      lookup[encoded[i + 3]];
    encoded[j] = x >> 16;
    encoded[j + 1] = (x >> 8) & 0xff;
    encoded[j + 2] = x & 0xff;
  }

  return new Uint8Array(encoded.buffer, 0, m);
}

// Normalize BufferSource to Uint8Array view
export function uint8ViewOf(bufferSource: BufferSource) {
  if (bufferSource instanceof ArrayBuffer) {
    return new Uint8Array(bufferSource);
  }
  return new Uint8Array(
    bufferSource.buffer,
    bufferSource.byteOffset,
    bufferSource.byteLength
  );
}

// Normalize BufferSource to ArrayBuffer
export function normalArrayBuffer(bufferSource: BufferSource) {
  if (bufferSource instanceof ArrayBuffer) {
    return bufferSource;
  }
  if (bufferSource.byteOffset === 0) {
    return bufferSource.buffer;
  }
  throw new Error("Unable to normalize partial view of ArrayBuffer");
}

// Encodes Uint8Array to base64/base64Url
export function b64Encode(source: BufferSource, toUrl: boolean = false) {
  let buf = uint8ViewOf(source);
  let m = buf.length;
  let k = m % 3;
  let n = Math.floor(m / 3) * 4 + (k && k + 1);
  let N = Math.ceil(m / 3) * 4;
  let encoded = new Uint8Array(N);

  for (let i = 0, j = 0; j < m; i += 4, j += 3) {
    let y = (buf[j] << 16) + (buf[j + 1] << 8) + (buf[j + 2] | 0);
    encoded[i] = encodeLookup[y >> 18];
    encoded[i + 1] = encodeLookup[(y >> 12) & 0x3f];
    encoded[i + 2] = encodeLookup[(y >> 6) & 0x3f];
    encoded[i + 3] = encodeLookup[y & 0x3f];
  }

  let b64 = decoder.decode(new Uint8Array(encoded.buffer, 0, n));

  if (toUrl) return b64.replace(/\+/g, "-").replace(/\//g, "_");
  if (k === 1) return b64 + "==";
  if (k === 2) return b64 + "=";

  return b64;
}

export function b64EncodeStr(rawString: string, toUrl: boolean = false) {
  return b64Encode(new TextEncoder().encode(rawString), toUrl);
}

const byteToHex = [] as string[];

for (let n = 0; n <= 0xff; ++n) {
  let hexOctet = n > 0xf ? n.toString(16) : "0" + n.toString(16);
  byteToHex.push(hexOctet);
}

// Get hex view of BufferSource
export function hexViewOf(bufferSource: BufferSource) {
  return uint8ViewOf(bufferSource).reduce((s, u) => s + byteToHex[u], "");
}

// Read uint8 value at byteOffset of bufferSource
export function uint8Read(arrayBuffer: Uint8Array, byteOffset: number) {
  return new Uint8Array(
    arrayBuffer.buffer,
    arrayBuffer.byteOffset + byteOffset,
    1
  )[0];
}

// Write uint8 value into bufferSource at byteOffset
export function uint8Write(
  value: number,
  arrayBuffer: Uint8Array,
  byteOffset: number
) {
  new Uint8Array(
    arrayBuffer.buffer,
    arrayBuffer.byteOffset + byteOffset,
    1
  )[0] = value;
}

// Read uint16 value at byteOffset of bufferSource
export function uint16Read(bufferSource: BufferSource, byteOffset: number) {
  let buf = normalArrayBuffer(bufferSource);
  return new Uint16Array(buf, byteOffset, 1)[0];
}

// Write uint16 value into bufferSource at byteOffset
export function uint16Write(
  value: number,
  bufferSource: BufferSource,
  byteOffset: number
) {
  let buf = normalArrayBuffer(bufferSource);
  new Uint16Array(buf, byteOffset, 1)[0] = value;
}

// Read uint32 value at byteOffset of bufferSource
export function uint32Read(arrayBuffer: Uint8Array, byteOffset: number) {
  return new Uint32Array(
    arrayBuffer.buffer,
    arrayBuffer.byteOffset + byteOffset,
    1
  )[0];
}

// Write uint32 value into bufferSource at byteOffset
export function uint32Write(
  value: number,
  arrayBuffer: Uint8Array,
  byteOffset: number
) {
  new Uint32Array(
    arrayBuffer.buffer,
    arrayBuffer.byteOffset + byteOffset,
    1
  )[0] = value;
}

// Read int8 value at byteOffset of bufferSource
export function int8Read(arrayBuffer: Uint8Array, byteOffset: number) {
  return new Int8Array(
    arrayBuffer.buffer,
    arrayBuffer.byteOffset + byteOffset,
    1
  )[0];
}

// Write int8 value into bufferSource at byteOffset
export function int8Write(
  value: number,
  bufferSource: BufferSource,
  byteOffset: number
) {
  let buf = normalArrayBuffer(bufferSource);
  new Int8Array(buf, byteOffset, 1)[0] = value;
}

// Read int16 value at byteOffset of bufferSource
export function int16Read(bufferSource: BufferSource, byteOffset: number) {
  let buf = normalArrayBuffer(bufferSource);
  return new Int16Array(buf, byteOffset, 1)[0];
}

// Write int16 value into bufferSource at byteOffset
export function int16Write(
  value: number,
  bufferSource: BufferSource,
  byteOffset: number
) {
  let buf = normalArrayBuffer(bufferSource);
  new Int16Array(buf, byteOffset, 1)[0] = value;
}

// Read int32 value at byteOffset of bufferSource
export function int32Read(bufferSource: BufferSource, byteOffset: number) {
  let buf = normalArrayBuffer(bufferSource);
  return new Int32Array(buf, byteOffset, 1)[0];
}

// Write int32 value into bufferSource at byteOffset
export function int32Write(
  value: number,
  bufferSource: BufferSource,
  byteOffset: number
) {
  let buf = normalArrayBuffer(bufferSource);
  new Int32Array(buf, byteOffset, 1)[0] = value;
}

// Read float32 value at byteOffset of bufferSource
export function float32Read(bufferSource: BufferSource, byteOffset: number) {
  let buf = normalArrayBuffer(bufferSource);
  return new Float32Array(buf, byteOffset, 1)[0];
}

// Write float32 value into bufferSource at byteOffset
export function float32Write(
  value: number,
  bufferSource: BufferSource,
  byteOffset: number
) {
  let buf = normalArrayBuffer(bufferSource);
  new Float32Array(buf, byteOffset, 1)[0] = value;
}

// Read float64 value at byteOffset of bufferSource
export function float64Read(bufferSource: BufferSource, byteOffset: number) {
  let buf = normalArrayBuffer(bufferSource);
  return new Float64Array(buf, byteOffset, 1)[0];
}

// Write float64 value into bufferSource at byteOffset
export function float64Write(
  value: number,
  bufferSource: BufferSource,
  byteOffset: number
) {
  let buf = normalArrayBuffer(bufferSource);
  new Float64Array(buf, byteOffset, 1)[0] = value;
}
