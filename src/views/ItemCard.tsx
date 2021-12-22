import { useEffect, useRef, useState } from "react";
import { Account } from "../common/account";
import { ManifestData } from "../common/downloader";
import { inferTypes } from "../common/ftypes";
import { getPrivateKey } from "../common/weave";
import Artifact from "../common/artifact";
import FileEntry from "../common/fileEntry";

const vbTxUrl = "https://viewblock.io/arweave/tx/";

type PropsType = {
  manifest: ManifestData;
  account: Account;
};

function formatTime(timestamp: number) {
  let htime = Date.now() / 1000 - timestamp;
  if (htime < 3600) return `${Math.floor(htime / 60)} minutes ago`;
  if (htime < 3600 * 24) return `${Math.floor(htime / 3600)} hours ago`;
  if (htime < 3600 * 24 * 10)
    return `${Math.floor(htime / 3600 / 24)} days ago`;

  let date = new Date(1000 * timestamp);
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
}

const textDecoder = new TextDecoder();

function ItemCard({ manifest, account }: PropsType) {
  let [, setTick] = useState(0);
  let [show, setShow] = useState(false);
  let [file, setFile] = useState<FileEntry>();
  let [showCopied, setShowCopied] = useState(false);
  let { id, timestamp } = manifest;
  let { current: artifact } = useRef<Artifact>(new Artifact());

  useEffect(() => {
    setFile(undefined);
  }, [show]);

  useEffect(() => {
    let timer = setTimeout(() => {
      setShowCopied(false);
    }, 1500);
    return () => clearTimeout(timer);
  }, [showCopied]);

  useEffect(() => {
    let ab = new AbortController();
    if (!account.jwk) return;

    (async (abSignal) => {
      try {
        let key = await getPrivateKey(account.jwk!);
        await artifact.parseLeadingChunkData(manifest, key);
        if (abSignal.aborted) return;
        setTick((x) => x + 1);
      } catch (err) {
        // console.error("error");
        artifact.title = "~unable to decrypt this tx~";
        setTick((x) => x + 1);
      }
    })(ab.signal);

    return () => ab.abort();
    // eslint-disable-next-line
  }, []);

  let cn = (n: FileEntry) => (n === file ? "!bg-sky-300" : "");

  const onClickFile = (sfile: FileEntry) => {
    setFile(file === sfile ? undefined : sfile);
  };

  const onCopyContent = (text?: string) => {
    navigator.clipboard.writeText(text ?? "").then(() => setShowCopied(true));
  };

  const onSaveContent = () => {
    if (!file || !file.view) return;

    let { media } = inferTypes(file.name);
    let blob = new Blob([file.view], { type: media });
    let url = window.URL.createObjectURL(blob);

    let a = document.createElement("a");
    // @ts-ignore
    a.style = "display: none";
    document.body.appendChild(a);
    a.href = url;
    a.download = file.name;
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  const downloadData = () => {
    artifact.loadRemainChunks(setTick);
    setTick((x) => x + 1);
  };

  let content = undefined as any;

  if (file && !file.view && artifact.data) {
    file.view = artifact.data.subarray(file.offset, file.offset + file.size);
  }

  if (!!file?.view) {
    let { type } = inferTypes(file.name);
    if (type === "text") {
      content = textDecoder.decode(file.view);
    }
  }

  function buildContentView(file: FileEntry) {
    if (artifact.data) {
      file.view = artifact.data.subarray(file.offset, file.offset + file.size);
    }

    if (!!file.view) {
      let { type, media } = inferTypes(file.name);

      if (type === "image") {
        let blob = new Blob([file.view], { type: media });
        let imgUrl = URL.createObjectURL(blob);
        return <img src={imgUrl} alt="" className="w-full" />;
      }

      if (type === "text") {
        let content = textDecoder.decode(file.view);
        return (
          <pre className="text-xs text-sky-700 p-2 h-[320px] overflow-y-auto">
            {content}
          </pre>
        );
      }

      return (
        <p className="text-xs text-sky-700 p-2 h-[320px] overflow-y-auto">
          No preview for this file content, save it instead.
        </p>
      );
    }

    if (artifact.loading) {
      return (
        <div className="flex flex-col h-[120px] gap-4 items-center justify-center">
          <p>Downloading...{artifact.loadingPct.toFixed(0)}%</p>
        </div>
      );
    }

    return (
      <div className="flex flex-col h-[120px] gap-4 items-center justify-center">
        <p>Incomplete data...</p>
        <button
          className="bg-gray-200 hover:bg-gray-300 rounded px-2 py-1"
          onClick={downloadData}
        >
          Download right now!
        </button>
      </div>
    );
  }

  let fileEntries = artifact.rootEntry.entries ?? [];

  return (
    <div className="flex flex-col gap-1 border-solid border-[1px] border-gray-200 items-start my-4 p-2 shadow-sm bg-white rounded hover:bg-white hover:shadow">
      <p
        onClick={() => setShow((x) => !x)}
        className="select-none text-sky-600 text-lg cursor-pointer"
      >
        {artifact.title}{" "}
        <span className="text-xs text-gray-600">{formatTime(timestamp)}</span>
      </p>
      <a
        target="_blank"
        rel="noreferrer"
        href={`${vbTxUrl}${id}`}
        className="text-xs text-gray-400 cursor-pointer hover:underline select-none"
      >
        {id}
      </a>
      {show ? (
        <div className="w-full">
          <ul className="select-none flex flex-wrap gap-2">
            {fileEntries.map((f, i) => (
              <li
                key={i}
                onClick={() => onClickFile(f)}
                className={`px-[4px] bg-slate-200 text-sm hover:text-sky-800 rounded cursor-pointer ${cn(
                  f
                )}`}
              >
                {f.name}
              </li>
            ))}
          </ul>
          {file ? (
            <div className="mt-2 w-full relative rounded bg-gray-100">
              <div className="absolute fixed flex gap-1 top-1 right-1 select-none">
                {showCopied ? (
                  <span className="text-xs text-gray-400 px-1">~Copied~</span>
                ) : null}
                {file.view ? (
                  <button
                    className="text-xs rounded-full px-1 bg-gray-300 hover:bg-sky-300"
                    onClick={() => onSaveContent()}
                  >
                    Save
                  </button>
                ) : null}
                {content ? (
                  <button
                    onClick={() => onCopyContent(content)}
                    className="text-xs rounded-full px-1 bg-gray-300 hover:bg-sky-300"
                  >
                    Copy
                  </button>
                ) : null}
              </div>
              {buildContentView(file)}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export default ItemCard;
