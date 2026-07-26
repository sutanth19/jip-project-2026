import { z } from "zod";

import { MEDIA_PURPOSES } from "../storage/storage.types.js";

const optionalContextId = z.string().uuid("ID konteks media tidak sah.").optional();

export const mediaUploadFieldsSchema = z.object({
  purpose: z.enum(MEDIA_PURPOSES, "Tujuan media tidak sah."),
  schoolId: optionalContextId,
  studentId: optionalContextId,
  teacherId: optionalContextId,
  activityId: optionalContextId,
}).strict();

export const mediaDeleteSchema = z.object({
  key: z.string().trim().min(1, "Kunci fail media diperlukan.").max(512, "Kunci fail media terlalu panjang."),
}).strict();

export type MediaUploadFields = z.infer<typeof mediaUploadFieldsSchema>;
