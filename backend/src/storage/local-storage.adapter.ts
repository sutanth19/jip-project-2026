import { randomUUID } from "node:crypto";
import { access, mkdir, rename, rm } from "node:fs/promises";
import { dirname, isAbsolute, relative, resolve } from "node:path";
import { constants } from "node:fs";

import { AppError } from "../errors/app-error.js";
import type { MediaPurpose, StorageAdapter, StorageUploadInput, StoredFile } from "./storage.types.js";

const PURPOSE_FOLDERS: Record<MediaPurpose, string> = {
  AVATAR: "avatar",
  SCHOOL_LOGO: "school-logo",
  ACTIVITY_IMAGE: "activity-image",
  ACTIVITY_DOCUMENT: "activity-document",
  ACTIVITY_AUDIO: "activity-audio",
  ACTIVITY_VIDEO: "activity-video",
  TRACING_ASSET: "tracing-asset",
  STUDENT_SUBMISSION_IMAGE: "student-submission-image",
  STUDENT_SUBMISSION_AUDIO: "student-submission-audio",
  STUDENT_SUBMISSION_DOCUMENT: "student-submission-document",
};

const SAFE_KEY = /^[a-z0-9-]+\/\d{4}\/\d{2}\/[0-9a-f-]{36}\.[a-z0-9]+$/;

function invalidKey(): AppError {
  return new AppError("MEDIA_FILENAME_INVALID", 400, "Kunci fail media tidak sah.");
}

export function assertSafeStorageKey(key: string): void {
  let decoded: string;
  try {
    decoded = decodeURIComponent(key);
  } catch {
    throw invalidKey();
  }
  if (
    !key ||
    key !== decoded ||
    key.includes("\0") ||
    decoded.includes("..") ||
    isAbsolute(decoded) ||
    !SAFE_KEY.test(decoded)
  ) {
    throw invalidKey();
  }
}

export class LocalStorageAdapter implements StorageAdapter {
  constructor(
    private readonly root: string,
    private readonly publicBaseUrl: string,
    private readonly now: () => Date = () => new Date(),
  ) {}

  private resolvedPath(key: string): string {
    assertSafeStorageKey(key);
    const path = resolve(this.root, key);
    const rootRelative = relative(this.root, path);
    if (rootRelative.startsWith("..") || isAbsolute(rootRelative)) throw invalidKey();
    return path;
  }

  private keyFor(input: StorageUploadInput): string {
    const date = this.now();
    const year = String(date.getUTCFullYear());
    const month = String(date.getUTCMonth() + 1).padStart(2, "0");
    return `${PURPOSE_FOLDERS[input.purpose]}/${year}/${month}/${randomUUID()}.${input.extension}`;
  }

  async upload(input: StorageUploadInput): Promise<StoredFile> {
    const key = this.keyFor(input);
    const destination = this.resolvedPath(key);
    try {
      await mkdir(dirname(destination), { recursive: true });
      await rename(input.temporaryFilePath, destination);
      return { key, url: this.getPublicUrl(key) };
    } catch {
      throw new AppError("MEDIA_STORAGE_FAILED", 500, "Fail media tidak dapat disimpan.");
    }
  }

  async delete(fileKey: string): Promise<void> {
    const path = this.resolvedPath(fileKey);
    try {
      await rm(path);
    } catch (caught: unknown) {
      if (isNotFound(caught)) throw new AppError("MEDIA_FILE_NOT_FOUND", 404, "Fail media tidak ditemui.");
      throw new AppError("MEDIA_DELETE_FAILED", 500, "Fail media tidak dapat dipadam.");
    }
  }

  async exists(fileKey: string): Promise<boolean> {
    try {
      await access(this.resolvedPath(fileKey), constants.R_OK);
      return true;
    } catch (caught: unknown) {
      if (caught instanceof AppError) throw caught;
      return false;
    }
  }

  getPublicUrl(fileKey: string): string | null {
    assertSafeStorageKey(fileKey);
    return `${this.publicBaseUrl}/${fileKey}`;
  }

  resolveReadPath(fileKey: string): string {
    return this.resolvedPath(fileKey);
  }
}

function isNotFound(caught: unknown): boolean {
  return typeof caught === "object" && caught !== null && "code" in caught && (caught as { code?: unknown }).code === "ENOENT";
}
