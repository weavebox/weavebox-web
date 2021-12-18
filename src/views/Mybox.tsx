import { JWKInterface } from "arweave/node/lib/wallet";
import { useState } from "react";
import { Account } from "../common/account";
import { arweave } from "../common/weave";

type PropsType = {
  account: Account;
};

function Mybox(props: PropsType) {
  const [status, setStatus] = useState("");
  const account = props.account;

  const send = async () => {
    let key = account.jwk as JWKInterface;
    let tx = await arweave.createTransaction(
      {
        target: "_gnukmRQqoTeNdIyCXCvHTFqw1pbj2C6eHueLkuZyrI",
        quantity: arweave.ar.arToWinston("220"),
      },
      key
    );
    await arweave.transactions.sign(tx, key);
    const response = await arweave.transactions.post(tx);

    console.log(response.status);
    setStatus(response.statusText);
  };

  return (
    <div className="flex flex-col items-start gap-2">
      <p>{account.address}</p>
      <p>{status}</p>
      <button onClick={send}>Send</button>
    </div>
  );
}

export default Mybox;
