export type ReadProgressReporter = (msg: string, pct: number) => void;

export class FileEntry {
  name: string = "";
  size: number = 0;
  offset: number = 0;
  handle?: FileSystemHandle;
  file?: File;
  entries?: FileEntry[];
  aesKey?: CryptoKey;
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

  public listFiles(path: string, skipDirEntry: boolean) {
    let arr: { path: string; size: number }[] = [];
    if (!this.entries) return [];

    let thisPath = this.name ? `${this.name}/` : "";

    if (path) {
      thisPath = path + thisPath;
      if (!skipDirEntry) arr.push({ path: thisPath, size: this.size });
    }

    this.entries.forEach((e) => {
      if (e.isDir) {
        arr.push(...e.listFiles(thisPath, skipDirEntry));
      } else {
        arr.push({ path: `${thisPath}${e.name}`, size: e.size });
      }
    });

    return arr;
  }

  public buildIndexArray(): any[] {
    if (!!this.entries) {
      return [
        this.name,
        this.size,
        Array.from(this.entries, (e) => e.buildIndexArray()),
      ];
    }

    return [this.name, this.size];
  }

  public static fromIndexArray(indexes: any[]): FileEntry {
    let rootEntry = FileEntry.makeDirEntry();
    let [name, size, entries] = indexes;

    if (!entries) {
      throw new Error("FileEntry: loadIndexArray: broken root index");
    }

    rootEntry.name = name;
    entries?.forEach((sub: any[]) => {
      let entry = FileEntry.fromIndex(sub, rootEntry.offset + rootEntry.size);
      rootEntry.size += entry.size;
      rootEntry.entries?.push(entry);
    });

    if (rootEntry.size !== size) {
      throw new Error("inconsistent size");
    }

    return rootEntry;
  }

  private static fromIndex(index: any[], offset: number): FileEntry {
    let [name, size, entries] = index;

    if (!!entries) {
      let dirEntry = FileEntry.makeDirEntry();
      dirEntry.name = name;
      dirEntry.offset = offset;
      entries.forEach((sub: any[]) => {
        let child = FileEntry.fromIndex(sub, offset + size);
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
      rsize += await this.entries![i].readData("", buf, signal, readProgress);
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
