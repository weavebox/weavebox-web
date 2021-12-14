import { Account } from "../common/account";

type PropsType = {
  account: Account;
};

function Mybox(props: PropsType) {
  const account = props.account;
  return (
    <div className="flex gap-2">
      <p>{account.address}</p>
    </div>
  );
}

export default Mybox;
