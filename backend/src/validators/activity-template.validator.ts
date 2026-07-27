import {
  ActivityTemplateCategory,
  ActivityTemplateStatus,
  AssessmentMode,
  QuestionBankItemType,
} from "@prisma/client";
import { z } from "zod";

const uuid = (message: string) => z.string().trim().uuid(message);
const page = z.coerce.number().int().min(1).default(1);
const limit = z.coerce.number().int().min(1).max(100).default(20);
const queryBoolean = z.enum(["true", "false"]).transform((value) => value === "true");
const rendererKeys = [
  "multiple-choice",
  "matching",
  "drag-drop",
  "fill-blank",
  "arrange-syllables",
  "tracing",
  "reading",
  "voice-recording",
] as const;

const templateCode = z.string().trim().min(2).max(100)
  .regex(/^[A-Za-z0-9][A-Za-z0-9_-]*$/, "Kod templat tidak sah.")
  .transform((value) => value.toUpperCase());
const name = z.string().trim().min(1).max(300);
const optionalDescription = z.string().trim().min(1).max(10_000).nullable().optional();
const version = z.number().int().min(1).max(10_000);

const itemTypeRule = z.object({
  itemType: z.nativeEnum(QuestionBankItemType),
  isRequired: z.boolean().default(false),
  minimumItems: z.number().int().min(0).max(10_000).nullable().optional(),
  maximumItems: z.number().int().min(0).max(10_000).nullable().optional(),
}).strict().superRefine((value, context) => {
  if (value.minimumItems !== null && value.minimumItems !== undefined && value.maximumItems !== null && value.maximumItems !== undefined && value.maximumItems < value.minimumItems) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["maximumItems"], message: "Bilangan maksimum tidak boleh kurang daripada minimum." });
  }
});

const templateFields = {
  name,
  description: optionalDescription,
  category: z.nativeEnum(ActivityTemplateCategory),
  version,
  status: z.nativeEnum(ActivityTemplateStatus).default(ActivityTemplateStatus.ACTIVE),
  assessmentMode: z.nativeEnum(AssessmentMode),
  requiresTeacherReview: z.boolean().default(false),
  supportsAutoMarking: z.boolean().default(false),
  supportsMedia: z.boolean().default(false),
  supportsAudio: z.boolean().default(false),
  supportsVideo: z.boolean().default(false),
  supportsDrawing: z.boolean().default(false),
  supportsVoiceRecording: z.boolean().default(false),
  supportsFutureAI: z.boolean().default(false),
  configurationSchema: z.unknown(),
  contentSchema: z.unknown(),
  rendererKey: z.enum(rendererKeys),
  acceptedItemTypes: z.array(itemTypeRule).min(1).max(20).refine(
    (rules) => new Set(rules.map((rule) => rule.itemType)).size === rules.length,
    "Setiap jenis item hanya boleh didaftarkan sekali.",
  ),
};

export const activityTemplateIdParamsSchema = z.object({
  templateId: uuid("ID templat aktiviti tidak sah."),
}).strict();

export const createActivityTemplateSchema = z.object({
  code: templateCode,
  ...templateFields,
}).strict();

export const updateActivityTemplateSchema = z.object({
  name: templateFields.name.optional(),
  description: optionalDescription,
  category: templateFields.category.optional(),
  version: templateFields.version.optional(),
  status: z.enum([ActivityTemplateStatus.ACTIVE, ActivityTemplateStatus.INACTIVE]).optional(),
  assessmentMode: templateFields.assessmentMode.optional(),
  requiresTeacherReview: z.boolean().optional(),
  supportsAutoMarking: z.boolean().optional(),
  supportsMedia: z.boolean().optional(),
  supportsAudio: z.boolean().optional(),
  supportsVideo: z.boolean().optional(),
  supportsDrawing: z.boolean().optional(),
  supportsVoiceRecording: z.boolean().optional(),
  supportsFutureAI: z.boolean().optional(),
  configurationSchema: z.unknown().optional(),
  contentSchema: z.unknown().optional(),
  acceptedItemTypes: templateFields.acceptedItemTypes.optional(),
}).strict().refine((value) => Object.keys(value).length > 0, {
  message: "Sekurang-kurangnya satu medan kemas kini diperlukan.",
});

export const updateActivityTemplateStatusSchema = z.object({
  status: z.enum([ActivityTemplateStatus.ACTIVE, ActivityTemplateStatus.INACTIVE]),
}).strict();

export const listActivityTemplatesQuerySchema = z.object({
  page,
  limit,
  search: z.string().trim().min(1).max(250).optional(),
  status: z.nativeEnum(ActivityTemplateStatus).optional(),
  category: z.nativeEnum(ActivityTemplateCategory).optional(),
  assessmentMode: z.nativeEnum(AssessmentMode).optional(),
  supportsAutoMarking: queryBoolean.optional(),
  supportsDrawing: queryBoolean.optional(),
  supportsVoiceRecording: queryBoolean.optional(),
  supportsFutureAI: queryBoolean.optional(),
  sortBy: z.enum(["createdAt", "updatedAt", "code", "name", "category", "status", "version"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
}).strict();

export { rendererKeys };
export type CreateActivityTemplateBody = z.infer<typeof createActivityTemplateSchema>;
export type UpdateActivityTemplateBody = z.infer<typeof updateActivityTemplateSchema>;
export type ListActivityTemplatesQuery = z.infer<typeof listActivityTemplatesQuerySchema>;
