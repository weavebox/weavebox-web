import { useEffect, useState } from "react";
import { Account } from "../common/account";
import { ManifestData, syncManifestList } from "../common/downloader";
import ItemCard from "./ItemCard";

type PropsType = { account: Account };

function Mybox({ account }: PropsType) {
  let [manifestList, setManifestList] = useState<ManifestData[]>([]);
  let { address } = account;

  useEffect(() => {
    if (manifestList.length > 0) {
      setManifestList([]);
    }
    let ab = new AbortController();
    syncManifestList(setManifestList, address, ab.signal);
    return () => ab.abort();
  }, [address]);

  console.log(address, manifestList);

  return (
    <div className="w-full">
      {manifestList.map((m) => (
        <ItemCard key={m.id} manifest={m} account={account} />
      ))}
    </div>
  );
}

export default Mybox;
