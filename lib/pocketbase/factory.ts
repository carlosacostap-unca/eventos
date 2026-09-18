import PocketBase, { BaseAuthStore } from "pocketbase";

export function createPocketBaseClient(url: string, token?: string): PocketBase {
  const store = new BaseAuthStore();
  if (token) store.save(token, null);
  const client = new PocketBase(url, store);
  client.autoCancellation(false);
  return client;
}
