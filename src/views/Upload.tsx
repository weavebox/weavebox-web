import { JWKInterface } from "arweave/node/lib/wallet";
import { ChangeEvent, useEffect, useRef, useState } from "react";
import { Account } from "../common/account";
import Artifact from "../common/artifact";
import Uploader, { UploadResult } from "../common/uploader";
import { formatDataSize, MaxDataSize } from "../common/utils";
import Confirm from "./Confirm";
import Popup from "./Popup";

type PropsType = { account: Account };

function Upload({ account }: PropsType) {
  const selRef = useRef<HTMLInputElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const tagsRef = useRef<HTMLInputElement>(null);
  const recvRef = useRef<HTMLInputElement>(null);
  const memoRef = useRef<HTMLTextAreaElement>(null);
  const uploaderRef = useRef<Uploader>();

  const [, setTick] = useState(0);
  const [uploadResult, setResult] = useState<UploadResult>();
  const [artifact, setArtifact] = useState<Artifact>();
  const [status, setStatus] = useState("");
  const [confirmPopup, setConfirmPopup] = useState(false);

  useEffect(() => {
    return () => {
      uploaderRef.current!.abort();
      uploaderRef.current = undefined;
    };
  }, []);

  useEffect(() => {
    setStatus(`Pay address: ${account.address}`);
  }, [account]);

  useEffect(() => {
    if (status.match(/ellapsed time/i)) console.log(status);
  }, [status]);

  let uploader = uploaderRef.current!;

  if (!uploader) {
    uploader = new Uploader();
    uploaderRef.current = uploader;
    setStatus("Uploader ready.");
  }

  uploader.setConfirmPopup = setConfirmPopup;
  uploader.setResult = setResult;
  uploader.setStatus = setStatus;

  const onFilesSelected = (evt: ChangeEvent<HTMLInputElement>) => {
    const files = evt.target?.files;
    if (!files || files.length < 1) return;

    let artifact = new Artifact();
    artifact.setRootFiles(Array.from(files));
    setArtifact(artifact);

    if (!!titleRef.current) {
      titleRef.current.value = files[0].name;
    }
  };

  const onFileItemClick = (filename: string) => {
    if (!!titleRef.current) {
      titleRef.current.value = filename;
    }
  };

  const onFileItemRemove = (file: any) => {
    file.entry.ignore = true;
    // Rebuild index to correct the sizes
    artifact?.rootEntry.buildIndexArray(0);
    setTick((x) => x + 1);
  };

  const onUploadClick = () => {
    if (!artifact || artifact.rootEntry.size <= 0) {
      setStatus("Error: artifact not prepared");
      return;
    }

    artifact.title = titleRef.current?.value || "";
    artifact.memo = memoRef.current?.value || "";

    let tagsText = tagsRef.current?.value || "";
    artifact.tags = tagsText.split(/[\s,;]+/).map((x) => x.trim());

    uploader.kickStart(artifact, account);
  };

  const onSelectFiles = async () => {
    if (!window.showOpenFilePicker) {
      selRef.current?.click();
      return;
    }
    const hs = await window.showOpenFilePicker({ multiple: true });
    let files = [] as File[];
    for (let i = 0; i < hs.length; ++i) {
      files.push(await hs[i].getFile());
    }
    const artifact = new Artifact();
    artifact.setRootFiles(files);
    setArtifact(artifact);
    if (!!titleRef.current) {
      titleRef.current.value = files[0].name;
    }
  };

  const onSelectFolder = async () => {
    const dirHandle = await window.showDirectoryPicker();
    if (titleRef.current) {
      titleRef.current.value = dirHandle.name;
    }
    const artifact = new Artifact();
    await artifact.setRootHandle(dirHandle);
    setArtifact(artifact);
  };

  const totalSize = artifact?.rootEntry.size ?? 0;
  const sizeColor = totalSize > MaxDataSize ? "text-red-500" : "text-gray-500";
  const statusColor = status.match(/Error|have cancelled/i)
    ? "text-red-500"
    : "text-gray-500";

  if (!!uploadResult) {
    const txid = uploader.tx?.id;
    return (
      <section className="w-full flex flex-col gap-4 items-start">
        <h2 className="font-bold">{uploadResult.message}</h2>
        <p>Transaction ID: {txid}</p>
        <p>Mine status:</p>
        <a
          className="underline hover:text-sky-800"
          target="_blank"
          rel="noreferrer"
          href={`https://arweave.net/tx/${txid}`}
        >
          https://arweave.net/tx/{txid}
        </a>
        <a
          className="underline hover:text-sky-800"
          target="_blank"
          rel="noreferrer"
          href={`https://viewblock.io/arweave/tx/${txid}`}
        >
          https://viewblock.io/arweave/tx/{txid}
        </a>
        <p className="text-pink-600">
          It takes a few minutes to mine your transaction, until then you can
          see it in your box.
        </p>
        <button
          className="bg-sky-200 mt-8 px-2 py-1 rounded hover:bg-sky-300"
          onClick={() => setResult(undefined)}
        >
          Back
        </button>
      </section>
    );
  }

  let files = artifact?.rootEntry.listEntryPath("", false) ?? [];

  return (
    <section className="w-full">
      <h2 className="font-bold">Upload or send your files</h2>

      <div className="mt-2 flex gap-1 items-end w-full">
        <p className="md:flex-1">Files</p>
        <div className={`flex-1 text-sm text-center ${sizeColor}`}>
          <p>{`Total file size: ${formatDataSize(totalSize)}`}</p>
        </div>
        <div className="md:flex-1 flex gap-2 justify-end text-sm">
          <button
            onClick={onSelectFolder}
            className="rounded bg-sky-200 text-sky-600 hover:bg-sky-600 hover:text-white px-2 py-1 disabled:hover:bg-sky-200 disabled:text-gray-400"
          >
            Select folder
          </button>
          <button
            onClick={onSelectFiles}
            className="rounded bg-sky-200 text-sky-600 hover:bg-sky-600 hover:text-white px-2 py-1 disabled:hover:bg-sky-200 disabled:text-gray-400"
          >
            Select files
          </button>
        </div>
        <input
          ref={selRef}
          onChange={onFilesSelected}
          multiple={true}
          type="file"
          className="hidden"
        />
      </div>

      <div className="mt-1 rounded bg-gray-100 w-full h-[199px] overflow-y-auto">
        <ul className="p-[2px] text-sm w-full">
          {files.map((file) => (
            <li
              key={file.path}
              className="flex m-[1px] px-2 py-1 rounded bg-gray-200 hover:bg-gray-300 select-none group"
            >
              <button onClick={() => onFileItemClick(file.path)}>
                {file.path}
              </button>
              <span className="flex-1 pr-4 text-right">
                {formatDataSize(file.size)}
              </span>
              <button
                className="text-red-900 hover:text-red-600 font-bold px-1 py-0 invisible group-hover:visible"
                onClick={() => onFileItemRemove(file)}
              >
                x
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="md:flex md:gap-2">
        <div className="mt-4 flex-1">
          <p className="mb-1">Title</p>
          <input
            type="text"
            ref={titleRef}
            className="rounded caret-sky-500 focus:caret-sky-500 w-full px-2 py-1 border-2 border-gray-300 focus:outline-none focus:border-sky-500"
            placeholder="Title here"
          />
        </div>
        <div className="mt-4 flex-1">
          <p className="mb-1">Tags</p>
          <input
            type="text"
            ref={tagsRef}
            className="w-full px-2 py-1 rounded caret-sky-500 focus:caret-sky-500 border-2 border-gray-300 focus:outline-none focus:border-sky-500"
            placeholder="Tag, Your, Files"
          />
        </div>
      </div>

      <div className="md:flex md:gap-2 md:items-end">
        <div className="mt-4 flex-1">
          <p className="mb-1">Receiver (Optional)</p>
          <input
            type="text"
            ref={recvRef}
            className="rounded caret-sky-500 focus:caret-sky-500 w-full px-2 py-1 border-2 border-gray-300 focus:outline-none focus:border-sky-500"
            placeholder="Username or arweave address"
          />
        </div>
        <div className="flex-1 mb-2">
          <a
            target="_blank"
            rel="noreferrer"
            href="https://name.weavebox.app"
            className="inline text-sm text-sky-500 cursor-help hover:underline"
          >
            How WeaveBox resolves name?
          </a>
        </div>
      </div>

      <div className="mt-4">
        <p className="mb-1">Memo</p>
        <textarea
          style={{ resize: "none" }}
          ref={memoRef}
          className="w-full px-2 py-1 h-[80px] rounded caret-sky-500 focus:caret-sky-500 border-2 border-gray-300 focus:outline-none focus:border-sky-500"
          placeholder="Write an effective memo here"
        />
      </div>

      <div className="mt-6 flex gap-2 items-start">
        <div className={`flex-1 break-all ${statusColor}`}>{status}</div>
        <div className="flex gap-2">
          <button
            onClick={onUploadClick}
            className="rounded px-2 py-1 bg-sky-200 text-sky-800 hover:bg-sky-300"
          >
            Upload
          </button>
        </div>
      </div>

      <Popup
        id="confirmPopup"
        isModal={true}
        visible={confirmPopup}
        setVisible={setConfirmPopup}
      >
        <Confirm uploader={uploader} />
      </Popup>
    </section>
  );
}

export default Upload;
