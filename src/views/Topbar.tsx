import { picasso } from "@vechain/picasso";
import { Dispatch, SetStateAction, useEffect, useState } from "react";
import { Account } from "../common/account";
import { arweave, ArweaveApi } from "../common/weave";
import Login from "./Login";
import Popup from "./Popup";

type PropsType = {
  box: any;
  account: {
    account: Account;
    setAccount: Dispatch<SetStateAction<Account>>;
  };
};

function formatShortAddress(address: string) {
  const len = address.length;
  return len > 6 ? `${address.slice(0, 6)}…${address.slice(len - 6)}` : address;
}

function Topbar(props: PropsType) {
  const [userPopup, setUserPopup] = useState(false);
  const { box, selectBox } = props.box;
  const { account, setAccount } = props.account;

  useEffect(() => {
    if (account.fake) return;

    let aborted = false;
    let address = account.address;

    // Query account balance
    ArweaveApi.get(`wallet/${address}/balance`, {
      // override JSON.parse behaviour
      transformResponse: [(data) => data],
    }).then((resp) => {
      if (aborted) return;
      let balance = arweave.ar.winstonToAr(resp.data, {
        decimals: 6,
      });
      setAccount({ ...account, balance });
    });

    return () => {
      aborted = true;
    };
    // eslint-disable-next-line
  }, [account.address]);

  const NavItem = ({ name }: any) => {
    let cn =
      "px-[6px] py-[4px] sm:px-[8px] sm:py-[4px] rounded-full hover:bg-sky-200 sm:hover:bg-sky-300 hover:text-slate-900 cursor-pointer";
    if (box === name) {
      cn += " bg-sky-200 sm:bg-sky-300 text-slate-900";
    }
    return (
      <li className={cn} onClick={() => selectBox(name)}>
        {name}
      </li>
    );
  };

  const name = account.name || "Anonymous";
  const svg = picasso(account.address);

  return (
    <>
      <header className="fixed w-full md:bg-white bg-sky-50 shadow select-none z-10">
        <div className="flex px-[8px] py-[4px] items-center max-w-screen-lg mx-auto">
          <div className="flex-grow flex">
            <h1
              className="text-xl text-sky-600 font-bold cursor-pointer"
              onClick={() => selectBox()}
            >
              WeaveBox
            </h1>
          </div>
          <ul className="hidden md:flex flex-grow-0 gap-2 px-[6px] py-[4px] rounded-full text-sm text-gray-600 bg-sky-100">
            <NavItem name="Mybox" />
            <NavItem name="Inbox" />
            <NavItem name="Outbox" />
            <NavItem name="Upload" />
          </ul>
          <div
            onClick={() => setUserPopup((s) => !s)}
            className="flex-grow flex justify-end items-center gap-2"
          >
            <div className="flex flex-col gap-[6px] items-end">
              <p className="text-[13px] text-gray-600 leading-none cursor-pointer">
                {name}
              </p>
              <code className="text-[11px] text-gray-500 leading-none hover:underline hover:decoration-sky-500 cursor-pointer">
                {formatShortAddress(account.address)}
              </code>
            </div>
            <img
              alt="User avatar"
              src={`data:image/svg+xml;utf8,${svg}`}
              className="rounded-full w-[32px] h-[32px] cursor-pointer"
            />
          </div>
        </div>
        <ul className="md:hidden bg-white flex gap-1 px-[8px] py-[4px] text-xs sm:text-sm text-gray-600">
          <NavItem name="Mybox" />
          <NavItem name="Inbox" />
          <NavItem name="Outbox" />
          <NavItem name="Upload" />
        </ul>
      </header>
      <Popup id="userPopup" visible={userPopup} setVisible={setUserPopup}>
        <Login account={account} setAccount={setAccount} />
      </Popup>
    </>
  );
}

export default Topbar;
