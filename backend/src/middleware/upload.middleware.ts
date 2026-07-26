import { mkdir } from "node:fs/promises";
import { join } from "node:path";

import multer, { MulterError } from "multer";
import type { NextFunction, Request, Response } from "express";

import { AppError } from "../errors/app-error.js";
import { getStorageConfig, uploadSizeLimits } from "../storage/storage.config.js";

const config = getStorageConfig();
const temporaryDirectory = join(config.localRoot, ".tmp");

const upload = multer({
  storage: multer.diskStorage({
    destination: async (_req, _file, callback) => {
      try {
        await mkdir(temporaryDirectory, { recursive: true });
        callback(null, temporaryDirectory);
      } catch {
        callback(new AppError("MEDIA_STORAGE_FAILED", 500, "Fail media tidak dapat disimpan."), temporaryDirectory);
      }
    },
    filename: (_req, _file, callback) => {
      callback(null, `upload-${Date.now()}-${Math.random().toString(36).slice(2)}.tmp`);
    },
  }),
  limits: {
    files: 1,
    fileSize: uploadSizeLimits.video(),
    fields: 8,
    fieldSize: 4 * 1024,
  },
});

export function singleMediaUpload(req: Request, res: Response, next: NextFunction): void {
  upload.single("file")(req, res, (caught: unknown) => {
    if (!caught) {
      next();
      return;
    }
    if (caught instanceof MulterError && caught.code === "LIMIT_FILE_SIZE") {
      next(new AppError("MEDIA_FILE_TOO_LARGE", 413, "Saiz fail media melebihi had yang dibenarkan."));
      return;
    }
    if (caught instanceof MulterError) {
      next(new AppError("MEDIA_FILE_REQUIRED", 400, "Fail media tidak sah."));
      return;
    }
    next(caught);
  });
}
