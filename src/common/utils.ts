const KB = 1024;
const MB = 1024 * 1024;

export const MaxDataSize = 188 * MB;

export function formatDataSize(size: number) {
  if (size < KB) return `${size}B`;
  if (size < MB) return `${(size / KB).toFixed(2)}KB`;
  return `${(size / MB).toFixed(2)}MB`;
}

export type ReadFileProgressCallback = (
  readSize: number,
  totalSize: number
) => void;

export async function readFileAsync(
  file: File,
  buffer: Uint8Array,
  offset: number,
  cbProgress: ReadFileProgressCallback
): Promise<number> {
  const fsize = file.size;
  const fstream = file.stream();

  // @ts-ignore
  const freader = fstream.getReader();

  let rsize = 0;

  while (true) {
    const { value: chunk, done } = await freader.read();

    if (done) return offset + rsize;

    buffer.set(chunk, offset + rsize);
    rsize += chunk.length;

    cbProgress(rsize, fsize);
  }
}

export function readJsonFile(inputFile: File): Promise<string> {
  const fileReader = new FileReader();

  return new Promise<string>((resolve, reject) => {
    fileReader.onerror = () => {
      fileReader.abort();
      reject(new DOMException("Problem parsing input file."));
    };
    fileReader.onload = (evt) => {
      resolve(fileReader.result as string);
    };
    fileReader.readAsText(inputFile);
  });
}

export function formatMoney(amount: string) {
  return amount.replace(/\d(?=(\d{3})+\.)/g, "$&,");
}
