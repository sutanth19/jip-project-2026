import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { UserRole } from "@prisma/client";

import { AppError } from "../src/errors/app-error.js";
import { LocalStorageAdapter } from "../src/storage/local-storage.adapter.js";
import { deleteMedia, ensureMediaUploadAccess, getMediaReadFile, uploadMedia, type MediaAuditContext } from "../src/services/media.service.js";

const actor: MediaAuditContext = {
  actor: { userId: "user-1", profileId: "profile-1", role: UserRole.ADMIN, schoolId: "school-1" },
  requestIp: "127.0.0.1",
  userAgent: "media-test",
};

function png(): Buffer {
  const file = Buffer.alloc(24);
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]).copy(file);
  file.write("IHDR", 12, "ascii");
  file.writeUInt32BE(1, 16);
  file.writeUInt32BE(1, 20);
  return file;
}

async function fixture() {
  const directory = await mkdtemp(join(tmpdir(), "literasi-media-"));
  const temporaryFile = join(directory, "incoming.tmp");
  await writeFile(temporaryFile, png());
  return { directory, temporaryFile, adapter: new LocalStorageAdapter(join(directory, "uploads"), "/api/media/files", () => new Date("2026-07-26T00:00:00.000Z")) };
}

test("admin upload generates a random key, checksum and safe DTO", async () => {
  const setup = await fixture();
  const events: unknown[] = [];
  try {
    const dependencies = { adapter: setup.adapter, now: () => new Date("2026-07-26T00:00:00.000Z"), auditDispatcher: (event: unknown) => { events.push(event); } };
    const file = await uploadMedia({ file: { path: setup.temporaryFile, originalname: "../gambar.png", mimetype: "image/png", size: png().length }, purpose: "ACTIVITY_IMAGE" }, actor, dependencies);
    assert.match(file.key, /^activity-image\/2026\/07\/[0-9a-f-]{36}\.png$/);
    assert.equal(file.originalName, "gambar.png");
    assert.equal(file.url, `/api/media/files/${file.key}`);
    assert.match(file.checksum, /^[a-f0-9]{64}$/);
    assert.equal(file.key.includes("gambar"), false);
    assert.equal(events.length, 1);
    assert.deepEqual(events[0], { actorUserId: "user-1", actorProfileId: "profile-1", actorRole: UserRole.ADMIN, actorName: null, action: "MEDIA_UPLOADED", resourceType: "MEDIA", resourceId: file.key, schoolId: "school-1", before: null, after: null, metadata: { key: file.key, purpose: "ACTIVITY_IMAGE", mimeType: "image/png", size: png().length }, timestamp: new Date("2026-07-26T00:00:00.000Z"), requestIp: "127.0.0.1", userAgent: "media-test" });
    const readable = await getMediaReadFile(file.key, { adapter: setup.adapter });
    assert.equal(readable.mimeType, "image/png");
    assert.deepEqual(await readFile(readable.path), png());
    await deleteMedia(file.key, actor, dependencies);
    assert.equal(await setup.adapter.exists(file.key), false);
    assert.equal(events.length, 2);
    assert.equal((events[1] as { action: string }).action, "MEDIA_DELETED");
  } finally { await rm(setup.directory, { recursive: true, force: true }); }
});

test("teacher purpose allowlist and student/parent generic upload denial are enforced", () => {
  const teacher = { ...actor.actor, role: UserRole.TEACHER };
  ensureMediaUploadAccess(teacher, "ACTIVITY_IMAGE");
  for (const candidate of [
    { ...actor.actor, role: UserRole.TEACHER, purpose: "SCHOOL_LOGO" as const },
    { ...actor.actor, role: UserRole.STUDENT, purpose: "STUDENT_SUBMISSION_IMAGE" as const },
    { ...actor.actor, role: UserRole.PARENT, purpose: "ACTIVITY_IMAGE" as const },
  ]) {
    assert.throws(() => ensureMediaUploadAccess(candidate, candidate.purpose), (error: unknown) => error instanceof AppError && error.code === "MEDIA_ACCESS_DENIED");
  }
});

test("MIME, signature, and size validation reject unsupported or mismatched files and clean temporary files", async () => {
  const setup = await fixture();
  try {
    await assert.rejects(() => uploadMedia({ file: { path: setup.temporaryFile, originalname: "gambar.svg", mimetype: "image/svg+xml", size: png().length }, purpose: "ACTIVITY_IMAGE" }, actor, { adapter: setup.adapter }), (error: unknown) => error instanceof AppError && error.code === "MEDIA_TYPE_NOT_ALLOWED");
    await assert.rejects(() => readFile(setup.temporaryFile));
    await writeFile(setup.temporaryFile, Buffer.from("not a pdf"));
    await assert.rejects(() => uploadMedia({ file: { path: setup.temporaryFile, originalname: "dokumen.pdf", mimetype: "application/pdf", size: 9 }, purpose: "ACTIVITY_DOCUMENT" }, actor, { adapter: setup.adapter }), (error: unknown) => error instanceof AppError && error.code === "MEDIA_TYPE_NOT_ALLOWED");
  } finally { await rm(setup.directory, { recursive: true, force: true }); }
});

test("storage traversal and missing-file access cannot escape the configured root", async () => {
  const setup = await fixture();
  try {
    for (const key of ["../secret.png", "%2e%2e/secret.png", "/etc/passwd", "activity-image/2026/07/not-a-uuid.png"]) {
      assert.throws(() => setup.adapter.resolveReadPath(key), (error: unknown) => error instanceof AppError && error.code === "MEDIA_FILENAME_INVALID");
    }
    await assert.rejects(() => getMediaReadFile("activity-image/2026/07/00000000-0000-4000-8000-000000000000.png", { adapter: setup.adapter }), (error: unknown) => error instanceof AppError && error.code === "MEDIA_FILE_NOT_FOUND");
  } finally { await rm(setup.directory, { recursive: true, force: true }); }
});
