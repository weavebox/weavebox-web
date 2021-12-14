import { useEffect, useRef, useState } from "react";
import {
  FileMeta,
  formatDataSize,
  MaxDataSize,
  readFileAsync,
} from "../common/utils";

type StepNames =
  | "begin_verify_recipient"
  | "verifying_recipient"
  | "begin_verify_sender"
  | "verifying_sender"
  | "begin_read"
  | "reading"
  | "encrypting"
  | "reset"
  | "error"
  | "done";

type StepInfo = {
  name: StepNames;
  message?: string;
  progress?: number;
};

type PropsType = {
  sendMode?: boolean;
};

function Upload(props: PropsType) {
  const abortController = useRef<AbortController>();
  const selRef = useRef<HTMLInputElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const tagsRef = useRef<HTMLInputElement>(null);
  const recvRef = useRef<HTMLInputElement>(null);

  const [files, setFiles] = useState<File[]>([]);
  const [step, setStep] = useState<StepInfo>();

  useEffect(() => {
    abortController.current?.abort();
    abortController.current = new AbortController();
    setStep({ name: "reset" });
    return () => abortController.current?.abort();
  }, [props.sendMode]);

  const sendMode = props.sendMode as boolean;

  const onFilesSelected = () => {
    const files = selRef.current?.files;
    if (files && files.length > 0) {
      setFiles(Array.from(files));
    }
  };

  let openEnabled = true;
  let editEnabled = !!files && files.length > 0;
  let nextEnabled = !!files && files.length > 0;

  let message = step?.message || "Firstly select your files…";
  let progress = step?.progress || 0;

  let titleText = editEnabled ? files[0].name : "";
  let totalSize = editEnabled ? files.reduce((p, n) => p + n.size, 0) : 0;
  let sizeColor = totalSize > MaxDataSize ? "text-red-500" : "text-gray-500";

  let stepName = step?.name;
  let nextAction = sendMode ? "Send" : "Upload";
  let cancelAction = null;

  if (!!stepName) {
    if (stepName === "verifying_sender" || stepName === "verifying_recipient") {
      nextEnabled = true;
      editEnabled = false;
      openEnabled = false;
      nextAction = "OK, Continue";
      cancelAction = "No, Cancel";
    } else if (stepName === "reset") {
      openEnabled = true;
      if (nextEnabled) {
        message =
          sendMode && !titleRef.current?.value
            ? "Enter recipient name or address…"
            : "Ready to go…";
      }
    } else if (stepName === "done") {
      nextEnabled = true;
      editEnabled = false;
      openEnabled = false;
      nextAction = "OK, GoBack";
    } else {
      nextEnabled = false;
      editEnabled = false;
      openEnabled = false;
    }
  }

  const onFileItemClick = (filename: string) => {
    if (!!titleRef.current) titleRef.current.value = filename;
  };

  const onNextStep = () => {
    let resetState = !stepName || stepName === "reset";
    const abortSignal = abortController.current?.signal;

    // Aborted flow
    if (!abortSignal || abortSignal.aborted) return;

    // 1. Verify the recipient
    if (resetState && sendMode) {
      setStep({
        name: "begin_verify_recipient",
        message: `Verifying recipient AR address…`,
      });
      verifyRecipientAsync(abortSignal);
      return;
    }

    // 2. Recipient ok, begin to verify the sender
    if (resetState || stepName === "verifying_recipient") {
      setStep({
        name: "begin_verify_sender",
        message: `Verifying your AR address…`,
      });
      verifySenderAsync(abortSignal);
      return;
    }

    // 3. Sender ok, begin to read files
    if (stepName === "verifying_sender") {
      setStep({ name: "begin_read", message: `Begin to read file…` });
      readFilesAsync(abortSignal);
      return;
    }

    if (stepName === "done") {
      setStep({ name: "reset" });
      if (recvRef.current) {
        recvRef.current.value = "";
      }
    }
  };

  const verifyRecipientAsync = async (abortSignal: AbortSignal) => {
    setStep({
      name: "verifying_recipient",
      message: `Send files to Anoymous<O0rXAiB0O-qp2xp3i5Yq17JOnetm65x8hUf48eMm_E8>!! Continue?`,
    });
  };

  const verifySenderAsync = async (abortSignal: AbortSignal) => {
    setStep({
      name: "verifying_sender",
      message: `This action will cost you about 0.000424 AR!! Continue?`,
    });
  };

  const readFilesAsync = async (abortSignal: AbortSignal) => {
    const buffer = new Uint8Array(totalSize);
    const metas = [] as FileMeta[];

    if (abortSignal.aborted) return;

    let offset = 0;
    for (let i = 0; i < files.length; ++i) {
      const file = files[i];
      const beginOffset = offset;

      offset = await readFileAsync(
        file,
        buffer,
        beginOffset,
        (rsize, fsize) => {
          if (abortSignal.aborted) {
            return { aborted: true };
          }
          setStep({
            name: "reading",
            message: `Reading file ${file.name}`,
            progress: (rsize * 100.0) / fsize,
          });
          return { aborted: false };
        }
      );

      if (abortSignal.aborted) return;

      metas.push({
        filename: file.name,
        offset: offset,
        size: file.size,
        view: buffer.subarray(beginOffset, offset),
      });
    }

    setStep({ name: "encrypting", message: `Encrypting content…` });

    // await encrypting

    setStep({
      name: "done",
      message: `Your files have uploaded to the Arweave network successfuly.`,
      progress: 100,
    });
  };

  const onCancelStep = () => {
    setStep({ name: "reset" });
  };

  // if (editEnabled && props.sendMode) {
  //   const to = recvRef.current?.value;
  //   nextEnabled = !!to && to.length > 0;
  //   message = "Recipient empty, fill name or address.";
  // } else {
  //   nextEnabled = true;
  //   message = "Ready to go…";
  // }

  let progressMessage = `[${progress.toFixed(0)}%] ${message}`;

  return (
    <div className="w-full">
      <h2 className="font-bold">
        {sendMode ? "Send your files" : "Upload your files"}
      </h2>

      <div className="mt-2 flex items-end w-full">
        <p>Files</p>
        <div className={`flex-1 ${sizeColor} text-sm text-center`}>
          <p>{`Total size: ${formatDataSize(totalSize)}`}</p>
        </div>
        <button
          disabled={!openEnabled}
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
            disabled={!editEnabled}
            defaultValue={titleText}
            className="rounded caret-sky-500 focus:caret-sky-500 w-full px-2 py-1 border-2 border-gray-300 focus:outline-none focus:border-sky-500"
            placeholder="Title here"
          />
        </div>
        <div className="mt-4 flex-1">
          <p className="mb-1">Tags</p>
          <input
            type="text"
            ref={tagsRef}
            disabled={!editEnabled}
            className="w-full px-2 py-1 rounded caret-sky-500 focus:caret-sky-500 border-2 border-gray-300 focus:outline-none focus:border-sky-500"
            placeholder="Tag, Your, Files"
          />
        </div>
      </div>

      {props.sendMode ? (
        <div className="md:flex md:gap-2 md:items-end">
          <div className="mt-4 flex-1">
            <p className="mb-1">Recipient</p>
            <input
              type="text"
              ref={recvRef}
              disabled={!editEnabled}
              className="rounded caret-sky-500 focus:caret-sky-500 w-full px-2 py-1 border-2 border-gray-300 focus:outline-none focus:border-sky-500"
              placeholder="Username or Arweave address"
            />
          </div>
          <div className="flex-1 mb-2">
            <a
              target="_blank"
              href="https://name.weavebox.app"
              className="inline text-sm text-sky-500 cursor-help hover:underline"
            >
              How WeaveBox resolves name?
            </a>
          </div>
        </div>
      ) : null}

      <div className="mt-4">
        <p className="mb-1">Memo</p>
        <textarea
          disabled={!editEnabled}
          style={{ resize: "none" }}
          className="w-full px-2 py-1 h-[80px] rounded caret-sky-500 focus:caret-sky-500 border-2 border-gray-300 focus:outline-none focus:border-sky-500"
          placeholder="Write an effective memo here"
        />
      </div>

      <div className="mt-6 flex gap-2 items-start">
        <div className="flex-1 break-all">{progressMessage}</div>
        <div className="flex gap-2">
          <button
            disabled={!nextEnabled}
            onClick={onNextStep}
            className="rounded bg-green-200 text-green-700 hover:bg-green-600 hover:text-white px-2 py-1 disabled:hover:bg-green-200 disabled:text-gray-400"
          >
            {nextAction}
          </button>
          {cancelAction ? (
            <button
              disabled={!nextEnabled}
              onClick={onCancelStep}
              className="rounded bg-pink-200 text-pink-600 hover:bg-pink-600 hover:text-white px-2 py-1 disabled:hover:bg-pink-100 disabled:text-gray-400"
            >
              {cancelAction}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default Upload;
