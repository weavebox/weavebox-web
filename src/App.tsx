import Topbar from "./views/Topbar";
import Mybox from "./views/Mybox";
import Upload from "./views/Upload";
import Home from "./views/Home";
import { useEffect, useState } from "react";
import { FakeUser } from "./common/account";
import { invalidateAweaveAddress } from "./common/weave";
import { loadSessionData } from "./common/crypto";
import { msgUnpack } from "./common/msgpack";
import { b64Decode } from "./common/base64";

type BoxTypes = "Mybox" | "Inbox" | "Outbox" | "Upload";

export default function App() {
  const [account, setAccount] = useState(FakeUser);
  const [box, setBox] = useState<BoxTypes | undefined>("Mybox");
  const selectBox = (item: any) => setBox(item);

  useEffect(() => {
    let sessionData = loadSessionData();
    if (sessionData && sessionData.length) {
      let decoded = b64Decode(sessionData);
      let [[address]] = msgUnpack(decoded);
      invalidateAweaveAddress(address);
      setAccount({ address });
    }
  }, []);

  const createContent = () => {
    switch (box) {
      case "Upload":
        return <Upload account={account} />;
      case "Mybox":
        return <Mybox account={account} />;
    }
    return <Home start={() => setBox("Mybox")} />;
  };

  return (
    <div className="text-gray-600 bg-gray-50 antialiased">
      <Topbar box={{ box, selectBox }} account={{ account, setAccount }} />
      <section className="max-h-screen flex flex-col max-w-screen-md mx-auto sm:px-4 px-2">
        <div className="pt-[80px] md:pt-[60px] h-px w-full"></div>
        <div className="flex flex-col overflow-y-auto items-start gap-4">
          {createContent()}
        </div>
      </section>
    </div>
  );
}
