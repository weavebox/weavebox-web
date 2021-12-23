export type ReadProgressReporter = (msg: string, pct: number) => void;

export class FileEntry {
  name: string = "";
  size: number = 0;
  offset: number = 0;
  handle?: FileSystemHandle;
  file?: File;
  view?: Uint8Array;
  entries?: FileEntry[];
  aesKey?: CryptoKey;
  ignore?: boolean;
  iv?: Uint8Array;

  public static makeFileEntry(file?: File) {
    const fileEntry = new FileEntry();
    if (!!file) {
      fileEntry.name = file.name;
      fileEntry.size = file.size;
      fileEntry.file = file;
    }
    return fileEntry;
  }

  public static makeDirEntry() {
    const dirEntry = new FileEntry();
    dirEntry.entries = [];
    return dirEntry;
  }

  public get isDir() {
    return !!this.entries;
  }

  public get currentOffset() {
    return this.offset + this.size;
  }

  public listEntryPath(path: string, skipDirEntry: boolean) {
    let arr: { entry: FileEntry; path: string; size: number }[] = [];
    let len = this.entries?.length ?? 0;

    for (let i = 0; i < len; ++i) {
      let e = this.entries![i];
      if (e.ignore) continue;

      if (e.isDir) {
        let epath = `${path}${e.name}/`;
        if (!skipDirEntry) {
          arr.push({ entry: e, path: epath, size: e.size });
        }
        arr.push(...e.listEntryPath(epath, skipDirEntry));
        continue;
      }

      let epath = `${path}${e.name}`;
      arr.push({ entry: e, path: epath, size: e.size });
    }

    return arr;
  }

  public buildIndexArray(offset: number): any[] {
    this.offset = offset;

    if (!this.entries) return [this.name, this.size];

    let result = [];
    let size = 0;
    let len = this.entries.length;

    for (let i = 0; i < len; ++i) {
      let ent = this.entries[i];
      if (ent.ignore) {
        ent.offset = offset + size;
        continue;
      }
      let res = ent.buildIndexArray(offset + size);
      size += res[1];
      result.push(res);
    }

    this.size = size;
    return [this.name, this.size, ...result];
  }

  public importIndexArray(indexes: any[]) {
    let [name, size, entries] = indexes;

    if (!entries) {
      throw new Error("FileEntry: loadIndexArray: broken root index");
    }

    this.entries = [];

    this.name = name;
    entries?.forEach((sub: any[]) => {
      let entry = FileEntry.fromIndex(sub, this.offset + this.size);
      this.size += entry.size;
      this.entries?.push(entry);
    });

    if (this.size !== size) {
      throw new Error("inconsistent size");
    }
  }

  private static fromIndex(index: any[], offset: number): FileEntry {
    let [name, size, entries] = index;

    if (!!entries) {
      let dirEntry = FileEntry.makeDirEntry();
      dirEntry.name = name;
      dirEntry.offset = offset;
      entries.forEach((sub: any[]) => {
        let childOffset = offset + dirEntry.size;
        let child = FileEntry.fromIndex(sub, childOffset);
        dirEntry.size += child.size;
        dirEntry.entries?.push(child);
      });

      if (dirEntry.size !== size) {
        throw new Error("inconsistent size");
      }

      return dirEntry;
    }

    let fileEntry = FileEntry.makeFileEntry();
    fileEntry.name = name;
    fileEntry.size = size;
    fileEntry.offset = offset;
    return fileEntry;
  }

  public addFile(file: File) {
    if (!this.isDir) {
      throw new Error("FileEntry: add file into non-dir entry");
    }

    const fileEntry = FileEntry.makeFileEntry(file);
    fileEntry.offset = this.currentOffset;
    this.size += fileEntry.size;
    this.entries!.push(fileEntry);
  }

  public async addHandle(fsHandle: FileSystemHandle) {
    if (!this.isDir) {
      throw new Error("FileEntry: add handle into non-dir entry");
    }

    if (fsHandle.kind === "directory") {
      // Ignore large node_modules files included
      // TODO: Use glob pattern to ignore dirs/files
      if (fsHandle.name === "node_modules" || fsHandle.name.startsWith(".")) {
        return;
      }

      const dirEntry = FileEntry.makeDirEntry();
      dirEntry.name = fsHandle.name;
      dirEntry.offset = this.currentOffset;

      for await (let handle of fsHandle.values()) {
        if (handle.kind === "file") {
          await dirEntry.addHandle(handle);
        }
      }

      for await (let handle of fsHandle.values()) {
        if (handle.kind === "directory") {
          await dirEntry.addHandle(handle);
        }
      }

      dirEntry.handle = fsHandle;
      this.size += dirEntry.size;
      this.entries!.push(dirEntry);
    } else if (fsHandle.kind === "file") {
      const file = await fsHandle.getFile();
      this.addFile(file);
    }
  }

  public async loadData(
    signal: AbortSignal,
    readProgress: ReadProgressReporter
  ) {
    if (!this.isDir || this.offset !== 0) {
      throw new Error("FileEntry: loadData: !dir or offset !== 0");
    }

    let len = this.entries!.length;
    let buf = new Uint8Array(this.size);
    let rsize = 0;

    for (let i = 0; i < len; ++i) {
      let ent = this.entries![i];
      if (ent.ignore) continue;
      rsize += await ent.readData("", buf, signal, readProgress);
    }

    if (rsize !== this.size) {
      throw new Error("FileEntry: loadData: inconsistent size");
    }

    return buf;
  }

  private async readData(
    path: string,
    buf: Uint8Array,
    signal: AbortSignal,
    readProgress: ReadProgressReporter
  ): Promise<number> {
    if (this.isDir) {
      let len = this.entries!.length;
      let rsize = 0;
      for (let i = 0; i < len; ++i) {
        if (this.entries![i].ignore) continue;
        rsize += await this.entries![i].readData(
          `${path}${this.name}/`,
          buf,
          signal,
          readProgress
        );
        if (signal.aborted) throw new Error("readData: aborted");
      }
      if (rsize !== this.size) {
        throw new Error("FileEntry: readData: inconsistent size");
      }
      return rsize;
    }

    if (!this.file || this.file.size !== this.size) {
      throw new Error("FileEntry: readData: !this.file or size inconsistent");
    }

    let fstream = this.file.stream();
    // @ts-ignore
    let freader = fstream.getReader();
    let rsize = 0;

    while (true) {
      const { value: chunk, done } = await freader.read();
      if (signal.aborted) throw new Error("readData: aborted");
      if (done) break;
      buf.set(chunk, this.offset + rsize);
      rsize += chunk.length;
      readProgress(
        `${path}${this.name}`,
        Math.floor((rsize * 100) / this.size)
      );
    }

    if (rsize !== this.file.size) {
      throw new Error("FileEntry: readData: size inconsistent");
    }

    return rsize;
  }
}

export default FileEntry;
