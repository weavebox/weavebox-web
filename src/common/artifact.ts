import FileEntry, { ReadProgressReporter } from "./fileEntry";

class Artifact {
  title: string = "";
  tags: string[] = [];
  memo: string = "";
  rootEntry: FileEntry;

  constructor(rootEntry?: FileEntry) {
    this.rootEntry = rootEntry ?? FileEntry.makeDirEntry();
  }

  public setRootFiles(files: File[]) {
    files.forEach((file) => this.rootEntry.addFile(file));
  }

  public async setRootHandle(handle: FileSystemHandle) {
    if (handle.kind === "directory") {
      for await (let h of handle.values()) {
        if (h.kind === "file") {
          await this.rootEntry.addHandle(h);
        }
      }
      for await (let h of handle.values()) {
        if (h.kind === "directory") {
          await this.rootEntry.addHandle(h);
        }
      }
    } else {
      let file = await handle.getFile();
      this.rootEntry.addFile(file);
    }
  }

  public listFiles() {
    return this.rootEntry.listFiles("", true);
  }

  public async buildTransactionData(
    signal?: AbortSignal,
    readProgress?: ReadProgressReporter
  ): Promise<[any, Uint8Array]> {
    signal ??= new AbortController().signal;
    readProgress ??= (msg, pct) => {};
    let indexes = this.rootEntry.buildIndexArray();
    // {
    //   let oriIndex = JSON.stringify(indexes);
    //   console.log(oriIndex);

    //   let newEntry = FileEntry.fromIndexArray(indexes);
    //   let gotIndex = JSON.stringify(newEntry.buildIndexArray());

    //   console.log(oriIndex === gotIndex);
    //   console.log(gotIndex);
    //   console.log(newEntry.listFiles("", true));
    // }
    let contents = await this.rootEntry.loadData(signal, readProgress);
    return [indexes, contents];
  }
}

export default Artifact;
