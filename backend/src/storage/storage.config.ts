import { resolve } from "node:path";

export interface StorageConfig {
  driver: "local";
  localRoot: string;
  publicBaseUrl: string;
}

function requiredPositiveMegabytes(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const value = Number(raw);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

export function megabytesToBytes(megabytes: number): number {
  return Math.floor(megabytes * 1024 * 1024);
}

export function getStorageConfig(): StorageConfig {
  const driver = process.env.STORAGE_DRIVER ?? "local";
  if (driver !== "local") {
    // A provider must be explicitly implemented before it can be selected.
    throw new Error("Unsupported storage driver configuration.");
  }

  const configuredRoot = process.env.STORAGE_LOCAL_ROOT ?? "storage/uploads";
  if (!configuredRoot.trim() || configuredRoot.includes("\0")) {
    throw new Error("Invalid local storage configuration.");
  }

  return {
    driver,
    localRoot: resolve(process.cwd(), configuredRoot),
    publicBaseUrl: (process.env.STORAGE_PUBLIC_BASE_URL ?? "/api/media/files").replace(/\/$/, ""),
  };
}

export const uploadSizeLimits = {
  image: () => megabytesToBytes(requiredPositiveMegabytes("MAX_IMAGE_UPLOAD_MB", 5)),
  document: () => megabytesToBytes(requiredPositiveMegabytes("MAX_DOCUMENT_UPLOAD_MB", 20)),
  audio: () => megabytesToBytes(requiredPositiveMegabytes("MAX_AUDIO_UPLOAD_MB", 25)),
  video: () => megabytesToBytes(requiredPositiveMegabytes("MAX_VIDEO_UPLOAD_MB", 100)),
  tracing: () => megabytesToBytes(requiredPositiveMegabytes("MAX_TRACING_UPLOAD_MB", 10)),
};
