import { useEffect, useRef, useState } from "react";
import Uploader from "../common/uploader";
import { formatDataSize, formatMoney } from "../common/utils";
import { arweave } from "../common/weave";

type PropsType = {
  uploader: Uploader;
};

function Confirm({ uploader }: PropsType) {
  const timerRef = useRef<any>();
  const [address, setAddress] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({
    estimateTime: 0,
    ellapsedTime: 0,
    pctComplete: 0,
  });

  const { estimateTime, ellapsedTime, pctComplete } = uploadProgress;
  const { tx } = uploader;

  useEffect(() => {
    if (!tx) return;
    arweave.wallets.ownerToAddress(tx.owner).then((x) => setAddress(x));
  }, [tx]);

  useEffect(() => {
    return () => {
      if (!timerRef.current) return;
      clearInterval(timerRef.current);
      timerRef.current = undefined;
    };
  }, []);

  if (!tx) return null;

  let { data_size, reward } = tx!;
  let dataSize = Number(data_size);

  let title = "CONFIRM YOUR TRANSACTION";
  if (confirmed) title = "UPLOADING TRANSACTION DATA";

  reward = arweave.ar.winstonToAr(reward, { decimals: 6 });

  const onConfirm = () => {
    setConfirmed(true);
    uploader.uploadConfirm();

    let t0 = performance.now();
    timerRef.current = setInterval(() => {
      let now = performance.now();
      let pctComplete = uploader.pctComplete;
      let ellapsedTime = Math.floor((now - t0) / 1000);
      let estimateTime = Math.floor(ellapsedTime * (1 - pctComplete / 100));
      setUploadProgress({ estimateTime, ellapsedTime, pctComplete });
    }, 1000);
  };

  const onCancel = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = undefined;
    }
    uploader.uploadCancel();
  };

  return (
    <div className="bg-white px-[16px] py-[18px] rounded">
      <div className="flex flex-col items-center gap-1 text-sm">
        <p className="font-bold py-4 text-gray-900">{title}</p>
        <div className="text-center">
          <p>Transaction ID:</p>
          <code className="text-xs text-gray-800 select-all hover:underline hover:decoration-sky-500 cursor-pointer">
            {tx.id}
          </code>
        </div>
        <div className="text-center">
          <p>Pay address:</p>
          <code className="text-xs text-gray-800 select-all hover:underline hover:decoration-sky-500 cursor-pointer">
            {address}
          </code>
        </div>
        <p>Upload data size: {formatDataSize(dataSize)}</p>
        <p>Estimate cost: {formatMoney(reward)}AR</p>
      </div>
      {confirmed ? (
        <div className="mt-6 flex items-strech justify-center gap-2">
          <div className="text-center bg-gray-100 px-6 py-1 rounded">
            <p className="text-gray-600">Progress</p>
            <pre>{pctComplete}%</pre>
          </div>
          <div className="text-center bg-gray-100 px-2 py-1 rounded">
            <p className="text-gray-600">Ellapsed time</p>
            <pre>{ellapsedTime}s</pre>
          </div>
          <div className="text-center bg-gray-100 px-2 py-1 rounded">
            <p className="text-gray-600">Estimate time</p>
            <pre>{estimateTime}s</pre>
          </div>
        </div>
      ) : (
        <div className="mt-6 flex items-center justify-center gap-4">
          <button
            className="rounded px-2 py-1 bg-pink-200 text-pink-800 hover:bg-pink-300"
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            className="rounded px-2 py-1 bg-sky-200 text-sky-800 hover:bg-sky-300"
            onClick={onConfirm}
          >
            Confirm
          </button>
        </div>
      )}
    </div>
  );
}

export default Confirm;
