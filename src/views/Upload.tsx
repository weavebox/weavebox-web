import { ChangeEvent, useEffect, useRef, useState } from "react";
import { Account } from "../common/account";
import Uploader, { UploadResult } from "../common/uploader";
import { formatDataSize, MaxDataSize } from "../common/utils";
import Confirm from "./Confirm";
import Popup from "./Popup";

type PropsType = {
  account: Account;
};

function Upload({ account }: PropsType) {
  const selRef = useRef<HTMLInputElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const tagsRef = useRef<HTMLInputElement>(null);
  const recvRef = useRef<HTMLInputElement>(null);
  const memoRef = useRef<HTMLTextAreaElement>(null);
  const uploaderRef = useRef<Uploader>();

  const [uploadResult, setResult] = useState<UploadResult>();
  const [status, setStatus] = useState("");
  const [files, setFiles] = useState<File[]>([]);
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

  uploader.syncAccount(account);
  uploader.setConfirmPopup = setConfirmPopup;
  uploader.setResult = setResult;
  uploader.setStatus = setStatus;

  const onFilesSelected = (evt: ChangeEvent<HTMLInputElement>) => {
    const files = evt.target?.files;
    if (!files || files.length < 1) return;

    uploader.setFiles(Array.from(files));
    setFiles(uploader.files);
    setStatus(`Selected file size: ${formatDataSize(uploader.dataSize)}`);

    if (!!titleRef.current) {
      titleRef.current.value = files[0].name;
    }
  };

  const onFileItemClick = (filename: string) => {
    if (!!titleRef.current) {
      titleRef.current.value = filename;
    }
  };

  const onUploadClick = () => {
    let title = titleRef.current?.value || "";
    let memo = memoRef.current?.value || "";
    let _tags = tagsRef.current?.value || "";
    let tags = _tags.split(",").map((x) => x.trim());
    uploader.start({ title, tags, memo });
  };

  const totalSize = uploader.dataSize;
  const sizeColor = totalSize > MaxDataSize ? "text-red-500" : "text-gray-500";
  const statusColor = status.match(/Error|have cancelled/i)
    ? "text-red-500"
    : "text-gray-500";

  if (!!uploadResult) {
    return (
      <section className="w-full flex flex-col gap-4 items-start">
        <h2 className="font-bold">{uploadResult.message}</h2>
        <p>Tx ID: {uploader.tx?.id}</p>
        <button
          className="bg-sky-200 px-2 py-1 rounded hover:bg-sky-300"
          onClick={() => setResult(undefined)}
        >
          Back
        </button>
      </section>
    );
  }

  return (
    <section className="w-full">
      <h2 className="font-bold">Upload or send your files</h2>

      <div className="mt-2 flex items-end w-full">
        <p>Files</p>
        <div className={`flex-1 text-sm text-center ${sizeColor}`}>
          <p>{`Total file size: ${formatDataSize(totalSize)}`}</p>
        </div>
        <button
          onClick={() => selRef.current?.click()}
          className="rounded bg-sky-200 text-sky-600 hover:bg-sky-600 hover:text-white px-2 py-1 disabled:hover:bg-sky-200 disabled:text-gray-400"
        >
          Select files
        </button>
        <input
          ref={selRef}
          onChange={onFilesSelected}
          multiple={true}
          type="file"
          className="hidden"
        />
      </div>

      <div className="mt-1 rounded bg-gray-100 w-full h-[199px] overflow-y-auto">
        <ul className="p-[2px] text-sm">
          {files.map((file) => (
            <li
              key={file.name}
              className="m-[1px] px-2 py-1 rounded bg-gray-200 hover:bg-gray-300 select-none"
              onClick={() => onFileItemClick(file.name)}
            >{`${file.name} | ${formatDataSize(file.size)}`}</li>
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
