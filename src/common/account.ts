export type Account = {
  name?: string;
  address: string;
  jwk?: JsonWebKey;
  fake?: boolean;
  fakeAddress?: string;
  balance?: string;
};

export const FakeUser: Account = {
  name: "FakeUser",
  address: "noname0000000000000000000000000000000000006",
  fake: true,
};
