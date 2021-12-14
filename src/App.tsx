import Topbar from "./views/Topbar";
import Mybox from "./views/Mybox";
import Upload from "./views/Upload";
import Home from "./views/Home";

import "./css/font-face.min.css";
import "./css/style.css";
import { useState } from "react";
import { FakeUser } from "./common/account";

type BoxTypes = "Mybox" | "Inbox" | "Outbox" | "Upload" | "Send";

export default function App() {
  const [account, setAccount] = useState(FakeUser);
  const [box, setBox] = useState<BoxTypes | undefined>("Mybox");

  const selectBox = (item: any) => {
    setBox(item);
  };

  const createContent = () => {
    switch (box) {
      case "Upload":
        return <Upload />;
      case "Send":
        return <Upload sendMode={true} />;
      case "Mybox":
      case "Inbox":
      case "Outbox":
        return <Mybox account={account} />;
    }
    return <Home />;
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
