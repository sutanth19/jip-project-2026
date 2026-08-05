import { AssessmentStatus, MarkAdjustmentReason } from "@prisma/client";
import { z } from "zod";

const uuid = (message: string) => z.string().trim().uuid(message);
const page = z.coerce.number().int().min(1).default(1);
const limit = z.coerce.number().int().min(1).max(100).default(20);
const marks = z.coerce.number().min(0).max(999999.99).multipleOf(0.01);
const percentage = z.coerce.number().min(0).max(100).multipleOf(0.01);
const safeText = (max: number, label: string) => z.string().trim().min(1, `${label} diperlukan.`).max(max, `${label} terlalu panjang.`).refine((value) => !/<\s*\/?\s*[a-z][^>]*>/i.test(value), `${label} mesti teks biasa yang selamat.`);
const optionalText = (max: number, label: string) => safeText(max, label).nullable().optional();

export const assessmentIdParamsSchema = z.object({ assessmentId: uuid("ID pentaksiran tidak sah.") }).strict();
export const assessmentItemParamsSchema = z.object({ assessmentId: uuid("ID pentaksiran tidak sah."), activityItemId: uuid("ID item aktiviti tidak sah.") }).strict();
export const parentAssessmentParamsSchema = z.object({ studentId: uuid("ID murid tidak sah.") }).strict();

export const listAssessmentsQuerySchema = z.object({
  page, limit,
  search: z.string().trim().min(1).max(250).optional(),
  status: z.nativeEnum(AssessmentStatus).optional(),
  schoolId: uuid("ID sekolah tidak sah.").optional(),
  assignmentId: uuid("ID tugasan tidak sah.").optional(),
  studentId: uuid("ID murid tidak sah.").optional(),
  teacherId: uuid("ID guru tidak sah.").optional(),
  classId: uuid("ID kelas tidak sah.").optional(),
  sortBy: z.enum(["createdAt", "assessedAt", "finalMarks", "percentage"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
}).strict();

export const manualScoreSchema = z.object({
  marksAwarded: marks,
  possibleMarks: marks.optional(),
  teacherFeedback: optionalText(2_000, "Maklum balas guru"),
  internalNotes: optionalText(4_000, "Nota dalaman"),
}).strict().superRefine((value, context) => {
  if (value.possibleMarks !== undefined && value.marksAwarded > value.possibleMarks) context.addIssue({ code: "custom", path: ["marksAwarded"], message: "Markah tidak boleh melebihi markah penuh." });
});

export const adjustmentSchema = z.object({
  newMarks: marks,
  reason: z.nativeEnum(MarkAdjustmentReason),
  notes: optionalText(2_000, "Nota pelarasan"),
}).strict();

export const invalidateSchema = z.object({
  notes: optionalText(2_000, "Nota pembatalan"),
}).strict();

export const emptyBodySchema = z.object({}).strict();
export const percentageSchema = percentage;

export type ListAssessmentsQuery = z.infer<typeof listAssessmentsQuerySchema>;
export type ManualScoreInput = z.infer<typeof manualScoreSchema>;
export type AdjustmentInput = z.infer<typeof adjustmentSchema>;
export type InvalidateInput = z.infer<typeof invalidateSchema>;
