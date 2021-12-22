import Dexie from "dexie";

export const localdb = new Dexie("weavebox-db");

localdb.version(1).stores({
  artifacts: `id,address`,
});
