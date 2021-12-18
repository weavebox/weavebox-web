import { TransactionUploader } from "arweave/node/lib/transaction-uploader";
import Transaction from "arweave/web/lib/transaction";
import { Dispatch, SetStateAction } from "react";
import { Account } from "./account";
import { BoxItem } from "./boxItem";
import { readFileAsync } from "./utils";
import { arweave, getPublicKey } from "./weave";

function _T(t1: number, t2: number) {
  return (t1 - t2).toFixed(0);
}

export type UploadResult = {
  uploaded: boolean;
  message: string;
};

class Uploader {
  account?: Account;
  recipient?: Account;
  abortSignal: AbortSignal;
  abortController: AbortController;
  txUploader?: TransactionUploader;
  dataSize: number;
  rsaKey?: CryptoKey;
  tx?: Transaction;
  files: File[];
  item: BoxItem;

  setConfirmPopup!: Dispatch<SetStateAction<boolean>>;
  setStatus!: Dispatch<SetStateAction<string>>;
  setResult!: Dispatch<SetStateAction<UploadResult | undefined>>;

  constructor() {
    this.dataSize = 0;
    this.files = [];
    this.abortController = new AbortController();
    this.abortSignal = this.abortController.signal;
    this.item = new BoxItem();
  }

  syncAccount(account: Account) {
    this.account = account;
  }

  syncSendMode(sendMode: any) {
    if (!sendMode) this.recipient = undefined;
  }

  abort() {
    this.abortController.abort();
  }

  checkAborted() {
    if (this.abortSignal.aborted) {
      console.error("Uploader: upload aborted!");
      throw new Error("Uploader: upload aborted!");
    }
  }

  setFiles(files: File[]) {
    this.dataSize = files.reduce((p, n) => p + n.size, 0);
    this.files = files;
  }

  hasFiles = () => this.dataSize > 0;

  async start({ title, tags, memo }: any) {
    Object.assign(this.item, { title, tags, memo });
    try {
      await this.prepareTransaction();
    } catch (e) {
      let err = e as Error;
      this.setStatus(`[Error] ${err.message}`);
    }
  }

  async prepareTransaction() {
    let setStatus = this.setStatus;

    if (!this.files || this.files.length < 1) {
      throw new Error("Uploader: no selected files!");
    }

    let jwk = this.account?.jwk as any;

    if (!jwk) {
      throw new Error("Uploader: invalid account!");
    }

    this.rsaKey = await getPublicKey(jwk);

    this.checkAborted();

    this.item.data = new Uint8Array(this.dataSize);
    this.item.files = [];

    let offset = 0;
    let t0 = performance.now();
    let t1 = performance.now();
    let t2 = performance.now();

    // Read and concat files
    for (let i = 0; i < this.files.length; ++i) {
      const file = this.files[i];
      const beginOffset = offset;

      offset = await readFileAsync(
        file,
        this.item.data,
        beginOffset,
        (rsize, fsize) => {
          this.checkAborted();
          setStatus(
            `[${((rsize * 100) / fsize).toFixed(0)}%] Reading file ${file.name}`
          );
        }
      );

      this.checkAborted();

      this.item.files.push({
        name: file.name,
        offset: beginOffset,
        size: file.size,
        view: this.item.data.subarray(beginOffset, offset),
      });
    }

    t2 = performance.now();
    setStatus(
      `Read file time: ${_T(t2, t1)}ms, total ellapsed time: ${_T(t2, t0)}ms`
    );

    // Encrypt data
    t1 = performance.now();
    let txTag = await this.item.exportTxTag(this.rsaKey);
    let txData = await this.item.encryptData();

    t2 = performance.now();
    this.checkAborted();

    setStatus(
      `Encrypt time: ${_T(t2, t1)}ms, total ellapsed time: ${_T(t2, t0)}ms`
    );

    // Create and sign transaction
    t1 = performance.now();
    let tags = [
      { name: "app", value: "weavebox-v0" },
      { name: "box", value: txTag },
    ] as any;
    let tx = await arweave.createTransaction({ data: txData, tags }, jwk);

    t2 = performance.now();
    this.checkAborted();

    setStatus(
      `Create tx time: ${_T(t2, t1)}ms, total ellapsed time: ${_T(t2, t0)}ms`
    );

    t1 = performance.now();
    await arweave.transactions.sign(tx, jwk);

    t2 = performance.now();
    this.checkAborted();

    setStatus(
      `Sign tx time: ${_T(t2, t1)}ms, total ellapsed time: ${_T(t2, t0)}ms`
    );

    this.tx = tx;
    this.setConfirmPopup(true);

    console.log(this, txTag, tx.tags);
  }

  uploadCancel() {
    this.setStatus("You have cancelled the transaction.");
    this.setConfirmPopup(false);
  }

  uploadError(msg: string) {
    this.setStatus("[Error] " + msg);
    this.setConfirmPopup(false);
  }

  uploadConfirm() {
    this.internalUpload()
      .then(() => {
        this.setResult({
          uploaded: true,
          message: "Your transaction have been uploaded successfully.",
        });
        this.setConfirmPopup(false);
      })
      .catch((err) => {
        this.setResult({
          uploaded: false,
          message: "Fail to upload your transaction: " + err,
        });
        this.setConfirmPopup(false);
      });
  }

  async internalUpload() {
    if (!this.tx) throw new Error("Transaction not ready");

    this.txUploader = await arweave.transactions.getUploader(this.tx);

    while (!this.txUploader.isComplete) {
      await this.txUploader.uploadChunk();
    }
  }

  get pctComplete() {
    return this.txUploader?.pctComplete || 0;
  }
}

export default Uploader;
