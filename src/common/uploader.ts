import { TransactionUploader } from "arweave/node/lib/transaction-uploader";
import Transaction from "arweave/web/lib/transaction";
import { Dispatch, SetStateAction } from "react";
import { Account } from "./account";
import { WbItem } from "./wbitem";
import { readFileAsync } from "./utils";
import { arweave, getPublicKey } from "./weave";
import Artifact from "./artifact";
import { aesEncrypt, rsaEncrypt } from "./crypto";
import { msgPack, msgUnpack } from "./msgpack";
import { JWKInterface } from "arweave/web/lib/wallet";

const aesKeyGenParams = { name: "AES-GCM", length: 256 };
const kRsaInBlockSize = 446;
const kRsaOutBlockSize = 512;
const kAesIvSize = 12;
const kAesKeySize = 32;
const kFormatVer1 = 1;

function _T(t1: number, t2: number) {
  return (t1 - t2).toFixed(0);
}

export type UploadResult = {
  uploaded: boolean;
  message: string;
};

class Uploader {
  recipient?: Account;
  abortSignal: AbortSignal;
  abortController: AbortController;
  txUploader?: TransactionUploader;
  tx?: Transaction;

  setConfirmPopup!: Dispatch<SetStateAction<boolean>>;
  setStatus!: Dispatch<SetStateAction<string>>;
  setResult!: Dispatch<SetStateAction<UploadResult | undefined>>;

  constructor() {
    this.abortController = new AbortController();
    this.abortSignal = this.abortController.signal;
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

  async kickStart(artifact: Artifact, jwk: JWKInterface) {
    try {
      if (!artifact || artifact.rootEntry.size <= 0) {
        throw new Error("Uploader: no selected files!");
      }
      if (!jwk) throw new Error("Uploader: invalid account!");
      await this.prepareTransaction(artifact, jwk);
    } catch (err: any) {
      this.setStatus(`[Error] ${err.message}`);
    }
  }

  async prepareTransaction(artifact: Artifact, jwk: any) {
    let setStatus = this.setStatus;
    let t0 = performance.now();
    let t1 = performance.now();
    let t2 = performance.now();

    let [rootIndex, contents] = await artifact.buildTransactionData(
      this.abortSignal,
      (msg, pct) => {
        this.checkAborted();
        setStatus(`${msg} ${pct}%`);
      }
    );

    t2 = performance.now();
    this.checkAborted();
    setStatus(
      `Read file time: ${_T(t2, t1)}ms, total ellapsed time: ${_T(t2, t0)}ms`
    );

    // Encrypt data
    t1 = performance.now();

    let rsaPublicKey = await getPublicKey(jwk);
    let aesSalt = crypto.getRandomValues(new Uint8Array(kAesIvSize));
    let aesKey = await crypto.subtle.generateKey(aesKeyGenParams, true, [
      "encrypt",
      "decrypt",
    ]);

    let packedRootIndex = msgPack(rootIndex);
    let encryptedRootIndex = await aesEncrypt(packedRootIndex, aesKey, aesSalt);
    let indexSize = encryptedRootIndex.length;

    let aesRawKey = await crypto.subtle.exportKey("raw", aesKey);
    let packedBootData = msgPack([
      kFormatVer1,
      new Uint8Array(aesRawKey),
      aesSalt,
    ]);
    let encryptedBootData = await rsaEncrypt(packedBootData, rsaPublicKey);
    let bootSize = encryptedBootData.length;

    let encryptedContents = await aesEncrypt(contents, aesKey, aesSalt);
    let contentSize = encryptedContents.length;

    if (bootSize !== kRsaOutBlockSize) {
      throw new Error("unknown error, rsa encrypted size !== 512");
    }

    // console.log(JSON.stringify(rootIndex));
    // console.log(packedBootData, packedRootIndex);
    // console.log(msgUnpack(packedBootData), msgUnpack(packedRootIndex));
    console.log("encrypted size: ", bootSize, indexSize, contentSize);

    let data = new Uint8Array(bootSize + indexSize + contentSize);

    data.set(encryptedBootData, 0);
    data.set(encryptedRootIndex, bootSize);
    data.set(encryptedContents, bootSize + indexSize);

    t2 = performance.now();
    this.checkAborted();
    setStatus(
      `Encrypt time: ${_T(t2, t1)}ms, total ellapsed time: ${_T(t2, t0)}ms`
    );

    // Create and sign transaction
    t1 = performance.now();
    let tx = await arweave.createTransaction({ data }, jwk);
    tx.addTag("app", "weavebox");

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
