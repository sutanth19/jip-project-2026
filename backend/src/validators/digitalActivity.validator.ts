import { ActivityReviewMode, ActivityScoringMode, ActivityTemplateCategory, DigitalActivityStatus, LearningDifficulty } from "@prisma/client";
import { z } from "zod";

const uuid = (message: string) => z.string().trim().uuid(message);
const optionalNullable = <T extends z.ZodType>(schema: T) => schema.nullable().optional();
const page = z.coerce.number().int().min(1).default(1);
const limit = z.coerce.number().int().min(1).max(100).default(20);
const queryBoolean = z.enum(["true", "false"]).transform((value) => value === "true");
const templateCategories = z
  .string()
  .trim()
  .min(1)
  .transform((value, ctx) => value.split(",").map((entry) => entry.trim()).filter(Boolean))
  .superRefine((values, ctx) => {
    for (const value of values) {
      if (!Object.values(ActivityTemplateCategory).includes(value as ActivityTemplateCategory)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Kategori templat aktiviti tidak sah.",
        });
      }
    }
  })
  .transform((values) => values as ActivityTemplateCategory[]);
const safeText = (min: number, max: number, label: string) => z.string().trim().min(min, `${label} diperlukan.`).max(max, `${label} terlalu panjang.`).refine((value) => !/<\s*\/?\s*[a-z][^>]*>/i.test(value), `${label} mesti teks biasa yang selamat.`);
const optionalText = (max: number, label: string) => optionalNullable(safeText(1, max, label));
const code = z.string().trim().min(3).max(100).regex(/^[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*$/, "Kod aktiviti hanya boleh mengandungi huruf, nombor dan sempang.").transform((value) => value.toUpperCase());
const optionalPositive = z.number().int().min(1).max(100_000).nullable().optional();
const sequence = z.number().int().min(0).max(100_000);

export const digitalActivityIdParamsSchema = z.object({ activityId: uuid("ID aktiviti digital tidak sah.") }).strict();
export const activityCurriculumLinkParamsSchema = z.object({ activityId: uuid("ID aktiviti digital tidak sah."), linkId: uuid("ID pautan kurikulum tidak sah.") }).strict();
export const activityItemParamsSchema = z.object({ activityId: uuid("ID aktiviti digital tidak sah."), activityItemId: uuid("ID item aktiviti tidak sah.") }).strict();
export const activityMediaParamsSchema = z.object({ activityId: uuid("ID aktiviti digital tidak sah."), mediaLinkId: uuid("ID pautan media tidak sah.") }).strict();

const activityFields = {
  title: safeText(1, 500, "Tajuk"),
  description: optionalText(10_000, "Penerangan"),
  instructions: safeText(1, 10_000, "Arahan"),
  learningOutcome: optionalText(5_000, "Hasil pembelajaran"),
  programmeId: uuid("ID program kurikulum tidak sah."),
  activityTemplateId: uuid("ID templat aktiviti tidak sah."),
  difficulty: z.nativeEnum(LearningDifficulty),
  scoringMode: z.nativeEnum(ActivityScoringMode),
  reviewMode: z.nativeEnum(ActivityReviewMode),
  totalMarks: optionalPositive,
  masteryThreshold: z.number().int().min(1).max(100).nullable().optional(),
  estimatedMinutes: z.number().int().min(1).max(1_440).nullable().optional(),
  attemptsAllowed: z.number().int().min(1).max(100).nullable().optional(),
  timeLimitSeconds: z.number().int().min(1).max(86_400).nullable().optional(),
  shuffleItems: z.boolean().default(false),
  showImmediateFeedback: z.boolean().default(false),
  allowRetry: z.boolean().default(true),
  configuration: z.unknown(),
  rewardConfiguration: z.unknown().nullable().optional(),
  presentationSettings: z.unknown().nullable().optional(),
};

export const createDigitalActivitySchema = z.object({ code: code.optional(), ...activityFields }).strict();
export const updateDigitalActivitySchema = z.object({
  title: activityFields.title.optional(), description: activityFields.description, instructions: activityFields.instructions.optional(), learningOutcome: activityFields.learningOutcome,
  difficulty: activityFields.difficulty.optional(), scoringMode: activityFields.scoringMode.optional(), reviewMode: activityFields.reviewMode.optional(),
  totalMarks: activityFields.totalMarks, masteryThreshold: activityFields.masteryThreshold, estimatedMinutes: activityFields.estimatedMinutes,
  attemptsAllowed: activityFields.attemptsAllowed, timeLimitSeconds: activityFields.timeLimitSeconds, shuffleItems: z.boolean().optional(),
  showImmediateFeedback: z.boolean().optional(), allowRetry: z.boolean().optional(), configuration: z.unknown().optional(), rewardConfiguration: z.unknown().nullable().optional(), presentationSettings: z.unknown().nullable().optional(),
}).strict().refine((value) => Object.keys(value).length > 0, { message: "Sekurang-kurangnya satu medan kemas kini diperlukan." });

export const listDigitalActivitiesQuerySchema = z.object({
  page, limit, search: z.string().trim().min(1).max(250).optional(), status: z.nativeEnum(DigitalActivityStatus).optional(), difficulty: z.nativeEnum(LearningDifficulty).optional(),
  programmeId: uuid("ID program kurikulum tidak sah.").optional(), curriculumVersionId: uuid("ID versi kurikulum tidak sah.").optional(), activityTemplateId: uuid("ID templat aktiviti tidak sah.").optional(), templateCode: z.string().trim().min(1).max(100).optional(), templateCategory: z.nativeEnum(ActivityTemplateCategory).optional(), templateCategories: templateCategories.optional(),
  remedialSkillId: uuid("ID kemahiran pemulihan tidak sah.").optional(), contentStandardId: uuid("ID standard kandungan tidak sah.").optional(), learningStandardId: uuid("ID standard pembelajaran tidak sah.").optional(), curriculumYearId: uuid("ID tahun kurikulum tidak sah.").optional(), createdByUserId: uuid("ID pengguna tidak sah.").optional(), reviewMode: z.nativeEnum(ActivityReviewMode).optional(), scoringMode: z.nativeEnum(ActivityScoringMode).optional(),
  hasImage: queryBoolean.optional(), hasAudio: queryBoolean.optional(), hasVideo: queryBoolean.optional(),
  sortBy: z.enum(["code", "title", "difficulty", "status", "createdAt", "updatedAt", "publishedAt"]).default("createdAt"), sortOrder: z.enum(["asc", "desc"]).default("desc"),
}).strict();

export const createDigitalActivityCurriculumLinkSchema = z.object({
  curriculumYearId: uuid("ID tahun kurikulum tidak sah.").optional(), languageStructureId: uuid("ID struktur bahasa tidak sah.").optional(), remedialSkillId: uuid("ID kemahiran pemulihan tidak sah.").optional(), contentStandardId: uuid("ID standard kandungan tidak sah.").optional(), learningStandardId: uuid("ID standard pembelajaran tidak sah.").optional(), learningObjectiveId: uuid("ID objektif pembelajaran tidak sah.").optional(), isPrimary: z.boolean().default(false),
}).strict().refine((value) => Boolean(value.curriculumYearId || value.languageStructureId || value.remedialSkillId || value.contentStandardId || value.learningStandardId || value.learningObjectiveId), { message: "Sekurang-kurangnya satu rujukan kurikulum diperlukan." });

const activityItemFields = { questionBankItemId: uuid("ID item bank soalan tidak sah."), sequence, sectionKey: optionalText(100, "Kunci seksyen"), isRequired: z.boolean().default(true), marks: optionalPositive, configuration: z.unknown().nullable().optional() };
export const addDigitalActivityItemSchema = z.object(activityItemFields).strict();
export const updateDigitalActivityItemSchema = z.object({ sectionKey: activityItemFields.sectionKey, isRequired: z.boolean().optional(), marks: optionalPositive, configuration: z.unknown().nullable().optional() }).strict().refine((value) => Object.keys(value).length > 0, { message: "Sekurang-kurangnya satu medan kemas kini diperlukan." });
export const reorderDigitalActivityItemsSchema = z.object({ activityItemIds: z.array(uuid("ID item aktiviti tidak sah.")).min(1).max(1_000) }).strict().refine((value) => new Set(value.activityItemIds).size === value.activityItemIds.length, "Setiap item hanya boleh muncul sekali.");

export const ACTIVITY_MEDIA_ROLES = ["COVER_IMAGE", "INSTRUCTION_IMAGE", "INSTRUCTION_AUDIO", "BACKGROUND_AUDIO", "INTRO_VIDEO", "REFERENCE_AUDIO", "REFERENCE_VIDEO", "MASCOT_IMAGE", "REWARD_SOUND"] as const;
export const addDigitalActivityMediaSchema = z.object({ mediaKey: z.string().trim().min(1).max(512).refine((value) => !value.includes("..") && !value.includes("\0") && !value.startsWith("/") && !value.includes("\\"), "Kunci fail media tidak sah."), mediaRole: z.enum(ACTIVITY_MEDIA_ROLES), mimeType: z.string().trim().min(3).max(150).optional(), label: optionalText(255, "Label"), altText: optionalText(1_000, "Teks alternatif"), sequence: sequence.default(1), isPrimary: z.boolean().default(false) }).strict();
export const reorderDigitalActivityMediaSchema = z.object({ mediaLinkIds: z.array(uuid("ID pautan media tidak sah.")).min(1).max(1_000) }).strict().refine((value) => new Set(value.mediaLinkIds).size === value.mediaLinkIds.length, "Setiap pautan media hanya boleh muncul sekali.");
export const returnDraftSchema = z.object({ comment: safeText(1, 2_000, "Ulasan") }).strict();
export const emptyBodySchema = z.object({}).strict();

export type CreateDigitalActivityBody = z.infer<typeof createDigitalActivitySchema>;
export type UpdateDigitalActivityBody = z.infer<typeof updateDigitalActivitySchema>;
export type ListDigitalActivitiesQuery = z.infer<typeof listDigitalActivitiesQuerySchema>;
export type CreateDigitalActivityCurriculumLinkBody = z.infer<typeof createDigitalActivityCurriculumLinkSchema>;
export type AddDigitalActivityItemBody = z.infer<typeof addDigitalActivityItemSchema>;
export type UpdateDigitalActivityItemBody = z.infer<typeof updateDigitalActivityItemSchema>;
export type AddDigitalActivityMediaBody = z.infer<typeof addDigitalActivityMediaSchema>;
