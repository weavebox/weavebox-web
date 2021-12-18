import picasso from "@vechain/picasso";
import {
  ChangeEvent,
  Dispatch,
  SetStateAction,
  useEffect,
  useRef,
  useState,
} from "react";
import { Account, FakeUser } from "../common/account";
import { formatMoney, readJsonFile } from "../common/utils";
import { getAweaveAccountAddress } from "../common/weave";

type LoginType = "keyfile" | "arconnect" | "logout";

type PropsType = {
  account: Account;
  setAccount: Dispatch<SetStateAction<Account>>;
};

function Login(props: PropsType) {
  const openFileRef = useRef<HTMLInputElement>(null);
  const [menuPopup, setMenuPopup] = useState(false);
  const { account, setAccount } = props;

  useEffect(() => setMenuPopup(false), []);

  const switchAccount = (loginType: LoginType) => {
    const fileRef = openFileRef.current;
    if (!fileRef) return;

    if (loginType === "keyfile") {
      fileRef.value = "";
      fileRef.click();
    } else if (loginType === "logout") {
      setAccount(FakeUser);
    }
    setMenuPopup(false);
  };

  const openKeyfile = async (evt: ChangeEvent<HTMLInputElement>) => {
    const keyFile = evt.target.files?.[0];
    const fileType = keyFile?.type?.toLowerCase();

    if (!keyFile || fileType !== "application/json") {
      //TODO: Add alert message
      return;
    }

    const json = await readJsonFile(keyFile);
    const jwk = JSON.parse(json) as JsonWebKey;
    const address = await getAweaveAccountAddress(jwk);

    if (address !== account.address && openFileRef.current) {
      setAccount({ address, jwk });
      sessionStorage.setItem("keydata", json);
    }
  };

  const name = account.name || "Anonymous";
  const balance = account.balance || "0";
  const svg = picasso(account.address);

  const createMemuPop = () => (
    <div className="fixed mt-[54px] flex flex-col bg-gray-100 my-1 rounded">
      <button
        onClick={() => switchAccount("keyfile")}
        className="px-2 py-2 flex items-center text-sm rounded hover:bg-gray-200"
      >
        <img
          alt=""
          className="w-5 h-5 mr-1"
          src="https://img.icons8.com/material-outlined/2x/json.png"
        />
        Select a key file
      </button>
      <button
        onClick={() => switchAccount("arconnect")}
        className="px-2 py-2 flex items-center text-sm rounded hover:bg-gray-200"
      >
        <img
          alt=""
          className="w-5 h-5 mr-1"
          src="https://github.githubassets.com/images/icons/emoji/unicode/1f994.png"
        />
        Use ArConnect
      </button>
    </div>
  );

  return (
    <div className="bg-white px-[16px] py-[9px] rounded">
      <div className="mt-[12px] flex flex-col items-center gap-2 text-sm">
        <img
          alt="User avatar"
          src={`data:image/svg+xml;utf8,${svg}`}
          className="rounded-full w-[64px] h-[64px] cursor-pointer"
        />
        <p className="pt-4 text-xl font-bold text-gray-900">{name}</p>
        <code className="text-xs text-gray-800 select-all hover:underline hover:decoration-sky-500 cursor-pointer">
          {account.address}
        </code>
        <p className="text-black">{`Balance: ${formatMoney(balance)}AR`}</p>
        <div className="flex gap-4">
          {!account.fake ? (
            <button
              className="my-[24px] px-2 py-1 rounded bg-gray-600 text-white hover:bg-gray-700"
              onClick={() => switchAccount("logout")}
            >
              Logout
            </button>
          ) : null}
          <div className="flex flex-col items-center">
            <button
              className="my-[24px] px-2 py-1 rounded bg-sky-600 text-white hover:bg-sky-700"
              onClick={() => setMenuPopup((s) => !s)}
            >
              {account.fake ? "Login" : "Switch Account"}
            </button>
            <input
              ref={openFileRef}
              onChange={openKeyfile}
              type="file"
              className="hidden"
            />
            {menuPopup ? createMemuPop() : null}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;
