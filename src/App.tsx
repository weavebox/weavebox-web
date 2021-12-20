import Topbar from "./views/Topbar";
import Mybox from "./views/Mybox";
import Upload from "./views/Upload";
import Home from "./views/Home";
import { useEffect, useState } from "react";
import { FakeUser } from "./common/account";
import { getAweaveAccountAddress } from "./common/weave";

type BoxTypes = "Mybox" | "Inbox" | "Outbox" | "Upload";

export default function App() {
  const [account, setAccount] = useState(FakeUser);
  const [box, setBox] = useState<BoxTypes | undefined>("Mybox");

  const selectBox = (item: any) => {
    setBox(item);
  };

  useEffect(() => {
    let data = sessionStorage.getItem("keydata");
    if (!data) return;
    (async (json: string) => {
      try {
        const jwk = JSON.parse(json) as JsonWebKey;
        const address = await getAweaveAccountAddress(jwk);
        if (address !== account.address) {
          setAccount({ address, jwk });
        }
      } catch (err: any) {
        // console.log(err);
      }
    })(data);
    // eslint-disable-next-line
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
