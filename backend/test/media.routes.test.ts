import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import type { NextFunction, Request, Response } from "express";

import { getMediaFileController } from "../src/controllers/media.controller.js";
import { AppError } from "../src/errors/app-error.js";

function png(): Buffer {
  const file = Buffer.alloc(24);
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]).copy(file);
  file.write("IHDR", 12, "ascii");
  file.writeUInt32BE(1, 16);
  file.writeUInt32BE(1, 20);
  return file;
}

function routeSource(): string {
  return readFile(new URL("../src/routes/media.routes.ts", import.meta.url), "utf8");
}

async function createStoredLogo() {
  const directory = await mkdtemp(join(tmpdir(), "literasi-media-route-"));
  const uploadsRoot = join(directory, "uploads");
  const key = "school-logo/2026/08/11111111-1111-4111-8111-111111111111.png";
  const storedFile = join(uploadsRoot, key);
  process.env.STORAGE_LOCAL_ROOT = uploadsRoot;
  process.env.STORAGE_PUBLIC_BASE_URL = "/api/media/files";

  await mkdir(join(uploadsRoot, "school-logo", "2026", "08"), { recursive: true });
  await writeFile(storedFile, png());

  return { directory, key, storedFile };
}

function createResponse() {
  const headers = new Map<string, string>();
  let sentPath: string | null = null;
  const response = {
    setHeader(name: string, value: string) {
      headers.set(name.toLowerCase(), value);
    },
    sendFile(path: string, callback?: (error?: Error) => void) {
      sentPath = path;
      callback?.();
    },
  } as unknown as Response;

  return { response, headers, sentPath: () => sentPath };
}

test("media route exposes file reads before auth while uploads remain authenticated", async () => {
  const source = await routeSource();
  const getIndex = source.indexOf('router.get("/files/*key", getMediaFileController)');
  const authIndex = source.indexOf("router.use(authenticate, requirePasswordChanged, requireStudentPinChanged)");
  const postIndex = source.indexOf('router.post("/upload", uploadRateLimiter, singleMediaUpload, uploadMediaController)');

  assert.ok(getIndex >= 0);
  assert.ok(authIndex >= 0);
  assert.ok(postIndex >= 0);
  assert.ok(getIndex < authIndex);
  assert.ok(authIndex < postIndex);
});

test("public media controller returns image headers and a safe stored file path without auth", async () => {
  const setup = await createStoredLogo();
  const { response, headers, sentPath } = createResponse();
  let nextError: unknown;

  try {
    await getMediaFileController(
      { params: { key: setup.key } } as unknown as Request,
      response,
      ((error?: unknown) => {
        nextError = error;
      }) as NextFunction,
    );

    assert.equal(nextError, undefined);
    assert.equal(sentPath(), setup.storedFile);
    assert.equal(headers.get("content-type"), "image/png");
    assert.equal(headers.get("cross-origin-resource-policy"), "cross-origin");
    assert.match(headers.get("cache-control") ?? "", /public/);
    assert.equal(headers.get("x-content-type-options"), "nosniff");
    assert.equal(headers.get("content-disposition"), "inline");
  } finally {
    await rm(setup.directory, { recursive: true, force: true });
    delete process.env.STORAGE_LOCAL_ROOT;
    delete process.env.STORAGE_PUBLIC_BASE_URL;
  }
});

test("public media controller blocks invalid keys and reports missing safe files", async () => {
  const setup = await createStoredLogo();
  const { response } = createResponse();
  const invalidErrors: unknown[] = [];
  const missingErrors: unknown[] = [];

  try {
    await getMediaFileController(
      { params: { key: "school-logo/2026/08/not-a-uuid.png" } } as unknown as Request,
      response,
      ((error?: unknown) => {
        invalidErrors.push(error);
      }) as NextFunction,
    );
    await getMediaFileController(
      { params: { key: "school-logo/2026/08/22222222-2222-4222-8222-222222222222.png" } } as unknown as Request,
      response,
      ((error?: unknown) => {
        missingErrors.push(error);
      }) as NextFunction,
    );

    assert.equal(invalidErrors[0] instanceof AppError, true);
    assert.equal((invalidErrors[0] as AppError).code, "MEDIA_FILENAME_INVALID");
    assert.equal((invalidErrors[0] as AppError).statusCode, 400);
    assert.equal(missingErrors[0] instanceof AppError, true);
    assert.equal((missingErrors[0] as AppError).code, "MEDIA_FILE_NOT_FOUND");
    assert.equal((missingErrors[0] as AppError).statusCode, 404);
  } finally {
    await rm(setup.directory, { recursive: true, force: true });
    delete process.env.STORAGE_LOCAL_ROOT;
    delete process.env.STORAGE_PUBLIC_BASE_URL;
  }
});
