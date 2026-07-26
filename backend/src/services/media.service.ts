import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { rm, stat } from "node:fs/promises";
import { basename, extname } from "node:path";
import { UserRole } from "@prisma/client";

import { AppError } from "../errors/app-error.js";
import { getStorageAdapter } from "../storage/storage.service.js";
import { uploadSizeLimits } from "../storage/storage.config.js";
import type { MediaPurpose, StorageAdapter } from "../storage/storage.types.js";
import { dispatchAuditEvent, type AuditEventDispatcher } from "./audit.service.js";

export interface MediaActor {
  userId: string;
  profileId: string;
  role: UserRole;
  schoolId: string | null;
}

export interface MediaAuditContext {
  actor: MediaActor;
  requestIp?: string | null;
  userAgent?: string | null;
}

export interface MediaUploadFile {
  path: string;
  originalname: string;
  mimetype: string;
  size: number;
}

export interface MediaUploadInput {
  file: MediaUploadFile;
  purpose: MediaPurpose;
}

export interface MediaFileDto {
  key: string;
  url: string | null;
  originalName: string;
  mimeType: string;
  size: number;
  purpose: MediaPurpose;
  checksum: string;
  uploadedAt: Date;
}

export interface MediaServiceDependencies {
  adapter?: StorageAdapter;
  auditDispatcher?: AuditEventDispatcher;
  now?: () => Date;
  scanUploadedFile?: (file: MediaUploadFile) => Promise<"NOT_CONFIGURED" | "CLEAN">;
}

interface MediaRule {
  mimes: readonly string[];
  extensions: readonly string[];
  maxBytes: () => number;
  kind: "image" | "document" | "audio" | "video";
}

const imageMimes = ["image/jpeg", "image/png", "image/webp"] as const;
const documentMimes = ["application/pdf"] as const;
const audioMimes = ["audio/mpeg", "audio/wav", "audio/webm", "audio/ogg", "audio/mp4"] as const;
const videoMimes = ["video/mp4", "video/webm"] as const;

const RULES: Record<MediaPurpose, MediaRule> = {
  AVATAR: { mimes: imageMimes, extensions: ["jpg", "jpeg", "png", "webp"], maxBytes: uploadSizeLimits.image, kind: "image" },
  SCHOOL_LOGO: { mimes: imageMimes, extensions: ["jpg", "jpeg", "png", "webp"], maxBytes: uploadSizeLimits.image, kind: "image" },
  ACTIVITY_IMAGE: { mimes: imageMimes, extensions: ["jpg", "jpeg", "png", "webp"], maxBytes: uploadSizeLimits.image, kind: "image" },
  ACTIVITY_DOCUMENT: { mimes: documentMimes, extensions: ["pdf"], maxBytes: uploadSizeLimits.document, kind: "document" },
  ACTIVITY_AUDIO: { mimes: audioMimes, extensions: ["mp3", "wav", "webm", "ogg", "m4a", "mp4"], maxBytes: uploadSizeLimits.audio, kind: "audio" },
  ACTIVITY_VIDEO: { mimes: videoMimes, extensions: ["mp4", "webm"], maxBytes: uploadSizeLimits.video, kind: "video" },
  TRACING_ASSET: { mimes: imageMimes, extensions: ["jpg", "jpeg", "png", "webp"], maxBytes: uploadSizeLimits.tracing, kind: "image" },
  STUDENT_SUBMISSION_IMAGE: { mimes: imageMimes, extensions: ["jpg", "jpeg", "png", "webp"], maxBytes: uploadSizeLimits.image, kind: "image" },
  STUDENT_SUBMISSION_AUDIO: { mimes: audioMimes, extensions: ["mp3", "wav", "webm", "ogg", "m4a", "mp4"], maxBytes: uploadSizeLimits.audio, kind: "audio" },
  STUDENT_SUBMISSION_DOCUMENT: { mimes: documentMimes, extensions: ["pdf"], maxBytes: uploadSizeLimits.document, kind: "document" },
};

const MIME_EXTENSIONS: Record<string, readonly string[]> = {
  "image/jpeg": ["jpg", "jpeg"], "image/png": ["png"], "image/webp": ["webp"],
  "application/pdf": ["pdf"], "audio/mpeg": ["mp3"], "audio/wav": ["wav"],
  "audio/webm": ["webm"], "audio/ogg": ["ogg"], "audio/mp4": ["m4a", "mp4"],
  "video/mp4": ["mp4"], "video/webm": ["webm"],
};

const teacherPurposes = new Set<MediaPurpose>([
  "ACTIVITY_IMAGE", "ACTIVITY_DOCUMENT", "ACTIVITY_AUDIO", "TRACING_ASSET",
  "STUDENT_SUBMISSION_IMAGE", "STUDENT_SUBMISSION_AUDIO", "STUDENT_SUBMISSION_DOCUMENT",
]);

function mediaError(code: string, status: number, message: string): AppError {
  return new AppError(code, status, message);
}

export function ensureMediaUploadAccess(actor: MediaActor, purpose: MediaPurpose): void {
  if (actor.role === UserRole.SUPER_ADMIN || actor.role === UserRole.ADMIN) return;
  if (actor.role === UserRole.TEACHER && teacherPurposes.has(purpose)) return;
  throw mediaError("MEDIA_ACCESS_DENIED", 403, "Anda tidak dibenarkan memuat naik media ini.");
}

export function ensureMediaDeleteAccess(actor: MediaActor): void {
  if (actor.role !== UserRole.SUPER_ADMIN && actor.role !== UserRole.ADMIN) {
    throw mediaError("MEDIA_ACCESS_DENIED", 403, "Anda tidak dibenarkan memadam fail media.");
  }
}

function safeOriginalName(name: string): string {
  const safe = basename(name).replace(/[\x00-\x1f\x7f]/g, "").trim().slice(0, 255);
  if (!safe || safe === "." || safe === "..") throw mediaError("MEDIA_FILENAME_INVALID", 400, "Nama fail media tidak sah.");
  return safe;
}

function extensionFor(originalName: string): string {
  const extension = extname(originalName).slice(1).toLowerCase();
  if (!/^[a-z0-9]{1,10}$/.test(extension)) throw mediaError("MEDIA_FILENAME_INVALID", 400, "Nama fail media tidak sah.");
  return extension;
}

async function firstBytes(path: string, bytes = 64): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let collected = 0;
    const stream = createReadStream(path, { start: 0, end: bytes - 1 });
    stream.on("data", (chunk: Buffer) => { chunks.push(chunk); collected += chunk.length; });
    stream.on("error", reject);
    stream.on("end", () => resolve(Buffer.concat(chunks, collected)));
  });
}

function startsWith(bytes: Buffer, expected: readonly number[]): boolean {
  return expected.every((value, index) => bytes[index] === value);
}

function hasBoxType(bytes: Buffer): boolean { return bytes.length >= 12 && bytes.subarray(4, 8).toString("ascii") === "ftyp"; }

function signatureMatches(mimeType: string, bytes: Buffer): boolean {
  switch (mimeType) {
    case "image/png": return bytes.length >= 24 && startsWith(bytes, [137, 80, 78, 71, 13, 10, 26, 10]) && bytes.subarray(12, 16).toString("ascii") === "IHDR" && bytes.readUInt32BE(16) > 0 && bytes.readUInt32BE(20) > 0;
    case "image/jpeg": return startsWith(bytes, [255, 216, 255]);
    case "image/webp": return bytes.subarray(0, 4).toString("ascii") === "RIFF" && bytes.subarray(8, 12).toString("ascii") === "WEBP";
    case "application/pdf": return bytes.subarray(0, 5).toString("ascii") === "%PDF-";
    case "audio/mpeg": return bytes.subarray(0, 3).toString("ascii") === "ID3" || (bytes[0] === 255 && (bytes[1] & 0xe0) === 0xe0);
    case "audio/wav": return bytes.subarray(0, 4).toString("ascii") === "RIFF" && bytes.subarray(8, 12).toString("ascii") === "WAVE";
    case "audio/ogg": return bytes.subarray(0, 4).toString("ascii") === "OggS";
    case "audio/webm": case "video/webm": return startsWith(bytes, [0x1a, 0x45, 0xdf, 0xa3]);
    case "audio/mp4": case "video/mp4": return hasBoxType(bytes);
    default: return false;
  }
}

async function checksum(path: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = createHash("sha256");
    const stream = createReadStream(path);
    stream.on("data", (chunk: Buffer) => hash.update(chunk));
    stream.on("error", reject);
    stream.on("end", () => resolve(hash.digest("hex")));
  });
}

async function cleanTemporaryFile(path: string): Promise<void> {
  try { await rm(path, { force: true }); } catch { /* never disclose temporary paths */ }
}

async function validateFile(file: MediaUploadFile, purpose: MediaPurpose): Promise<{ originalName: string; extension: string; checksum: string }> {
  const rule = RULES[purpose];
  const originalName = safeOriginalName(file.originalname);
  const extension = extensionFor(originalName);
  if (!rule.mimes.includes(file.mimetype) || !rule.extensions.includes(extension) || !MIME_EXTENSIONS[file.mimetype]?.includes(extension)) {
    throw mediaError("MEDIA_TYPE_NOT_ALLOWED", 415, "Jenis fail media tidak dibenarkan.");
  }
  if (file.size <= 0) throw mediaError("MEDIA_FILE_REQUIRED", 400, "Fail media diperlukan.");
  if (file.size > rule.maxBytes()) throw mediaError("MEDIA_FILE_TOO_LARGE", 413, "Saiz fail media melebihi had yang dibenarkan.");
  const fileStat = await stat(file.path);
  if (!fileStat.isFile() || fileStat.size !== file.size) throw mediaError("MEDIA_STORAGE_FAILED", 500, "Fail media tidak dapat diproses.");
  if (!signatureMatches(file.mimetype, await firstBytes(file.path))) throw mediaError("MEDIA_TYPE_NOT_ALLOWED", 415, "Kandungan fail media tidak sepadan dengan jenis fail.");
  return { originalName, extension, checksum: await checksum(file.path) };
}

async function defaultScanUploadedFile(_file: MediaUploadFile): Promise<"NOT_CONFIGURED"> { return "NOT_CONFIGURED"; }

export async function uploadMedia(input: MediaUploadInput, context: MediaAuditContext, deps: MediaServiceDependencies = {}): Promise<MediaFileDto> {
  const adapter = deps.adapter ?? getStorageAdapter();
  const now = deps.now?.() ?? new Date();
  let storedKey: string | null = null;
  try {
    ensureMediaUploadAccess(context.actor, input.purpose);
    const validated = await validateFile(input.file, input.purpose);
    await (deps.scanUploadedFile ?? defaultScanUploadedFile)(input.file);
    const stored = await adapter.upload({ temporaryFilePath: input.file.path, purpose: input.purpose, extension: validated.extension });
    storedKey = stored.key;
    const result: MediaFileDto = { key: stored.key, url: stored.url, originalName: validated.originalName, mimeType: input.file.mimetype, size: input.file.size, purpose: input.purpose, checksum: validated.checksum, uploadedAt: now };
    await dispatchAuditEvent({ actorUserId: context.actor.userId, actorProfileId: context.actor.profileId, actorRole: context.actor.role, actorName: null, action: "MEDIA_UPLOADED", resourceType: "MEDIA", resourceId: stored.key, schoolId: context.actor.schoolId, before: null, after: null, metadata: { key: stored.key, purpose: input.purpose, mimeType: input.file.mimetype, size: input.file.size }, timestamp: now, requestIp: context.requestIp ?? null, userAgent: context.userAgent ?? null }, deps.auditDispatcher);
    return result;
  } catch (caught) {
    if (storedKey) {
      try { await adapter.delete(storedKey); } catch { /* preserve the original safe error */ }
    }
    throw caught;
  } finally {
    await cleanTemporaryFile(input.file.path);
  }
}

export async function deleteMedia(key: string, context: MediaAuditContext, deps: MediaServiceDependencies = {}): Promise<void> {
  ensureMediaDeleteAccess(context.actor);
  const adapter = deps.adapter ?? getStorageAdapter();
  if (!(await adapter.exists(key))) throw mediaError("MEDIA_FILE_NOT_FOUND", 404, "Fail media tidak ditemui.");
  await adapter.delete(key);
  await dispatchAuditEvent({ actorUserId: context.actor.userId, actorProfileId: context.actor.profileId, actorRole: context.actor.role, actorName: null, action: "MEDIA_DELETED", resourceType: "MEDIA", resourceId: key, schoolId: context.actor.schoolId, before: null, after: null, metadata: { key }, timestamp: deps.now?.() ?? new Date(), requestIp: context.requestIp ?? null, userAgent: context.userAgent ?? null }, deps.auditDispatcher);
}

export async function getMediaReadFile(key: string, deps: Pick<MediaServiceDependencies, "adapter"> = {}): Promise<{ path: string; mimeType: string }> {
  const adapter = deps.adapter ?? getStorageAdapter();
  if (!adapter.resolveReadPath || !(await adapter.exists(key))) {
    throw mediaError("MEDIA_FILE_NOT_FOUND", 404, "Fail media tidak ditemui.");
  }
  const extension = extname(key).slice(1).toLowerCase();
  const mimeType = mimeTypeForStoredKey(key, extension);
  if (!mimeType) throw mediaError("MEDIA_FILE_NOT_FOUND", 404, "Fail media tidak ditemui.");
  return { path: adapter.resolveReadPath(key), mimeType };
}

function mimeTypeForStoredKey(key: string, extension: string): string | undefined {
  if (extension === "mp4") return key.startsWith("activity-video/") ? "video/mp4" : "audio/mp4";
  return Object.entries(MIME_EXTENSIONS).find(([, extensions]) => extensions.includes(extension))?.[0];
}
