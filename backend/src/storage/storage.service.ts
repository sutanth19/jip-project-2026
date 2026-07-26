import { getStorageConfig } from "./storage.config.js";
import { LocalStorageAdapter } from "./local-storage.adapter.js";
import type { StorageAdapter } from "./storage.types.js";

let storageAdapter: StorageAdapter | undefined;

export function getStorageAdapter(): StorageAdapter {
  if (!storageAdapter) {
    const config = getStorageConfig();
    storageAdapter = new LocalStorageAdapter(config.localRoot, config.publicBaseUrl);
  }
  return storageAdapter;
}
