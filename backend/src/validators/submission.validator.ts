import { ItemReviewStatus, ReviewDecision, SubmissionStatus } from "@prisma/client";
import { z } from "zod";

const uuid = (message: string) => z.string().trim().uuid(message);
const page = z.coerce.number().int().min(1).default(1);
const limit = z.coerce.number().int().min(1).max(100).default(20);
const safeText = (max: number, label: string) => z.string().trim().min(1, `${label} diperlukan.`).max(max, `${label} terlalu panjang.`).refine((value) => !/<\s*\/?\s*[a-z][^>]*>/i.test(value), `${label} mesti teks biasa yang selamat.`);
const optionalText = (max: number, label: string) => safeText(max, label).nullable().optional();
const date = z.coerce.date();

export const submissionIdParamsSchema = z.object({ submissionId: uuid("ID penyerahan tidak sah.") }).strict();
export const submissionItemParamsSchema = z.object({ submissionId: uuid("ID penyerahan tidak sah."), activityItemId: uuid("ID item aktiviti tidak sah.") }).strict();
export const parentSubmissionParamsSchema = z.object({ studentId: uuid("ID murid tidak sah.") }).strict();

export const listSubmissionsQuerySchema = z.object({
  page, limit,
  search: z.string().trim().min(1).max(250).optional(),
  status: z.nativeEnum(SubmissionStatus).optional(),
  schoolId: uuid("ID sekolah tidak sah.").optional(),
  assignmentId: uuid("ID tugasan tidak sah.").optional(),
  studentId: uuid("ID murid tidak sah.").optional(),
  teacherId: uuid("ID guru tidak sah.").optional(),
  classId: uuid("ID kelas tidak sah.").optional(),
  submittedFrom: date.optional(), submittedTo: date.optional(),
  reviewedFrom: date.optional(), reviewedTo: date.optional(),
  rendererKey: z.string().trim().min(1).max(100).optional(),
  requiresManualReview: z.enum(["true", "false"]).transform((value) => value === "true").optional(),
  sortBy: z.enum(["submittedAt", "reviewedAt", "createdAt"]).default("submittedAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
}).strict().superRefine((value, context) => {
  if (value.submittedFrom && value.submittedTo && value.submittedFrom > value.submittedTo) context.addIssue({ code: "custom", message: "Julat tarikh penghantaran tidak sah." });
  if (value.reviewedFrom && value.reviewedTo && value.reviewedFrom > value.reviewedTo) context.addIssue({ code: "custom", message: "Julat tarikh semakan tidak sah." });
});

export const itemReviewSchema = z.object({
  status: z.enum([ItemReviewStatus.REVIEWED, ItemReviewStatus.REVISION_REQUIRED]),
  feedback: optionalText(2_000, "Maklum balas"),
  internalNotes: optionalText(4_000, "Nota dalaman"),
}).strict();

export const completeReviewSchema = z.object({
  decision: z.nativeEnum(ReviewDecision),
  overallFeedback: optionalText(2_000, "Maklum balas keseluruhan"),
  internalNotes: optionalText(4_000, "Nota dalaman"),
}).strict().superRefine((value, context) => {
  if (value.decision === ReviewDecision.REVISION_REQUIRED && !value.overallFeedback) context.addIssue({ code: "custom", path: ["overallFeedback"], message: "Arahan pembetulan diperlukan." });
});

export const emptyBodySchema = z.object({}).strict();

export type ListSubmissionsQuery = z.infer<typeof listSubmissionsQuerySchema>;
export type ItemReviewInput = z.infer<typeof itemReviewSchema>;
export type CompleteReviewInput = z.infer<typeof completeReviewSchema>;
