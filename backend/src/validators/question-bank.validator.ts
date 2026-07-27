import {
  DifficultyLevel,
  MediaRole,
  QuestionAnswerType,
  QuestionBankItemType,
  QuestionBankStatus,
} from "@prisma/client";
import { z } from "zod";

const uuid = (message: string) => z.string().trim().uuid(message);
const optionalNullable = <T extends z.ZodType>(schema: T) => schema.nullable().optional();
const page = z.coerce.number().int().min(1).default(1);
const limit = z.coerce.number().int().min(1).max(100).default(20);
const queryBoolean = z.enum(["true", "false"]).transform((value) => value === "true");
const sequence = z.number().int().min(0).max(100_000);

const plainText = (min: number, max: number, label: string) => z
  .string()
  .trim()
  .min(min, `${label} diperlukan.`)
  .max(max, `${label} terlalu panjang.`)
  .refine((value) => !/<\s*\/?\s*[a-z][^>]*>/i.test(value), `${label} mesti teks biasa yang selamat.`);

const optionalText = (max: number, label: string) => optionalNullable(
  plainText(1, max, label),
);

const metadata = z.unknown().optional();

export const questionBankItemIdParamsSchema = z.object({
  itemId: uuid("ID item bank soalan tidak sah."),
}).strict();

export const curriculumLinkParamsSchema = z.object({
  itemId: uuid("ID item bank soalan tidak sah."),
  linkId: uuid("ID pautan kurikulum tidak sah."),
}).strict();

export const optionParamsSchema = z.object({
  itemId: uuid("ID item bank soalan tidak sah."),
  optionId: uuid("ID pilihan jawapan tidak sah."),
}).strict();

export const mediaParamsSchema = z.object({
  itemId: uuid("ID item bank soalan tidak sah."),
  mediaLinkId: uuid("ID pautan media tidak sah."),
}).strict();

const itemFields = {
  programmeId: uuid("ID program kurikulum tidak sah."),
  type: z.nativeEnum(QuestionBankItemType),
  title: optionalText(500, "Tajuk"),
  content: plainText(1, 20_000, "Kandungan"),
  languagePattern: optionalText(500, "Pola bahasa"),
  instructions: optionalText(5_000, "Arahan"),
  explanation: optionalText(10_000, "Penerangan"),
  answerType: z.nativeEnum(QuestionAnswerType).default(QuestionAnswerType.NONE),
  correctAnswer: z.unknown().nullable().optional(),
  difficulty: z.nativeEnum(DifficultyLevel),
  sourceReference: optionalText(2_048, "Rujukan sumber"),
  metadata,
};

export const createQuestionBankItemSchema = z.object({
  ...itemFields,
  allowDuplicateOverride: z.boolean().optional(),
}).strict();

export const updateQuestionBankItemSchema = z.object({
  title: itemFields.title,
  content: itemFields.content.optional(),
  languagePattern: itemFields.languagePattern,
  instructions: itemFields.instructions,
  explanation: itemFields.explanation,
  answerType: z.nativeEnum(QuestionAnswerType).optional(),
  correctAnswer: z.unknown().nullable().optional(),
  difficulty: z.nativeEnum(DifficultyLevel).optional(),
  sourceReference: itemFields.sourceReference,
  metadata,
  allowDuplicateOverride: z.boolean().optional(),
}).strict().refine((value) => Object.keys(value).some((key) => key !== "allowDuplicateOverride"), {
  message: "Sekurang-kurangnya satu medan kemas kini diperlukan.",
});

export const duplicateCheckSchema = z.object({
  programmeId: uuid("ID program kurikulum tidak sah."),
  type: z.nativeEnum(QuestionBankItemType),
  content: plainText(1, 20_000, "Kandungan"),
  excludeItemId: uuid("ID item bank soalan tidak sah.").optional(),
}).strict();

export const questionBankStatusTransitionSchema = z.object({
  allowDuplicateOverride: z.boolean().optional(),
}).strict();

export const listQuestionBankItemsQuerySchema = z.object({
  page,
  limit,
  search: z.string().trim().min(1).max(250).optional(),
  status: z.nativeEnum(QuestionBankStatus).optional(),
  type: z.nativeEnum(QuestionBankItemType).optional(),
  difficulty: z.nativeEnum(DifficultyLevel).optional(),
  programmeId: uuid("ID program kurikulum tidak sah.").optional(),
  curriculumVersionId: uuid("ID versi kurikulum tidak sah.").optional(),
  yearLevel: z.coerce.number().int().min(1).max(100).optional(),
  languageStructureId: uuid("ID struktur bahasa tidak sah.").optional(),
  remedialSkillId: uuid("ID kemahiran pemulihan tidak sah.").optional(),
  contentStandardId: uuid("ID standard kandungan tidak sah.").optional(),
  learningStandardId: uuid("ID standard pembelajaran tidak sah.").optional(),
  createdByUserId: uuid("ID pengguna tidak sah.").optional(),
  hasImage: queryBoolean.optional(),
  hasAudio: queryBoolean.optional(),
  hasVideo: queryBoolean.optional(),
  sortBy: z.enum(["createdAt", "updatedAt", "title", "type", "difficulty", "status", "normalizedText"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
}).strict();

export const createCurriculumLinkSchema = z.object({
  remedialSkillId: uuid("ID kemahiran pemulihan tidak sah.").optional(),
  contentStandardId: uuid("ID standard kandungan tidak sah.").optional(),
  learningStandardId: uuid("ID standard pembelajaran tidak sah.").optional(),
  curriculumYearId: uuid("ID tahun kurikulum tidak sah.").optional(),
  isPrimary: z.boolean().default(false),
}).strict().refine((value) => Boolean(
  value.remedialSkillId || value.contentStandardId || value.learningStandardId || value.curriculumYearId,
), { message: "Sekurang-kurangnya satu rujukan kurikulum diperlukan." });

export const createAnswerOptionSchema = z.object({
  label: optionalText(100, "Label"),
  content: plainText(1, 5_000, "Kandungan pilihan"),
  isCorrect: z.boolean().default(false),
  sequence,
  metadata,
}).strict();

export const updateAnswerOptionSchema = z.object({
  label: optionalText(100, "Label"),
  content: plainText(1, 5_000, "Kandungan pilihan").optional(),
  isCorrect: z.boolean().optional(),
  metadata,
}).strict().refine((value) => Object.keys(value).length > 0, {
  message: "Sekurang-kurangnya satu medan kemas kini diperlukan.",
});

export const reorderOptionsSchema = z.object({
  optionIds: z.array(uuid("ID pilihan jawapan tidak sah.")).min(1).max(1_000),
}).strict().refine((value) => new Set(value.optionIds).size === value.optionIds.length, {
  message: "Setiap pilihan hanya boleh muncul sekali.",
});

export const createQuestionBankMediaSchema = z.object({
  mediaKey: z.string().trim().min(1).max(512).refine(
    (value) => !value.includes("\0") && !value.includes("..") && !value.startsWith("/") && !value.includes("\\"),
    "Kunci fail media tidak sah.",
  ),
  mediaRole: z.nativeEnum(MediaRole),
  mimeType: z.string().trim().min(3).max(150).optional(),
  originalName: z.string().trim().min(1).max(255).optional(),
  sequence: sequence.default(0),
  altText: optionalText(1_000, "Teks alternatif"),
}).strict();

export const reorderMediaSchema = z.object({
  mediaLinkIds: z.array(uuid("ID pautan media tidak sah.")).min(1).max(1_000),
}).strict().refine((value) => new Set(value.mediaLinkIds).size === value.mediaLinkIds.length, {
  message: "Setiap pautan media hanya boleh muncul sekali.",
});

export type CreateQuestionBankItemBody = z.infer<typeof createQuestionBankItemSchema>;
export type UpdateQuestionBankItemBody = z.infer<typeof updateQuestionBankItemSchema>;
export type ListQuestionBankItemsQuery = z.infer<typeof listQuestionBankItemsQuerySchema>;
export type CreateCurriculumLinkBody = z.infer<typeof createCurriculumLinkSchema>;
export type CreateAnswerOptionBody = z.infer<typeof createAnswerOptionSchema>;
export type UpdateAnswerOptionBody = z.infer<typeof updateAnswerOptionSchema>;
export type CreateQuestionBankMediaBody = z.infer<typeof createQuestionBankMediaSchema>;
