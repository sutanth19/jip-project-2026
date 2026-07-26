import {
  CurriculumDomain,
  CurriculumRecordStatus,
  CurriculumStatus,
} from "@prisma/client";
import { z } from "zod";

const uuidSchema = (message: string) => z.string().trim().uuid(message);

const optionalNullable = <T extends z.ZodType>(schema: T) =>
  schema.nullable().optional();

const versionCodeSchema = z
  .string()
  .trim()
  .min(2, "Kod versi kurikulum diperlukan.")
  .max(100, "Kod versi kurikulum terlalu panjang.")
  .regex(
    /^[A-Za-z0-9][A-Za-z0-9_-]*$/,
    "Kod versi hanya boleh mengandungi huruf, nombor, sempang dan garis bawah.",
  )
  .transform((value) => value.toUpperCase());

const curriculumCodeSchema = z
  .string()
  .trim()
  .min(1, "Kod diperlukan.")
  .max(100, "Kod terlalu panjang.")
  .regex(
    /^[A-Za-z0-9](?:[A-Za-z0-9._() -]*[A-Za-z0-9)])?$/,
    "Kod mengandungi aksara yang tidak sah.",
  )
  .transform((value) => value.replace(/\s+/g, " "));

const compactCodeSchema = z
  .string()
  .trim()
  .min(2, "Kod diperlukan.")
  .max(64, "Kod terlalu panjang.")
  .regex(
    /^[A-Za-z0-9][A-Za-z0-9_-]*$/,
    "Kod hanya boleh mengandungi huruf, nombor, sempang dan garis bawah.",
  )
  .transform((value) => value.toUpperCase());

const nameSchema = z
  .string()
  .trim()
  .min(1, "Nama diperlukan.")
  .max(300, "Nama terlalu panjang.");

const titleSchema = z
  .string()
  .trim()
  .min(1, "Tajuk diperlukan.")
  .max(500, "Tajuk terlalu panjang.");

const descriptionSchema = z
  .string()
  .trim()
  .min(1, "Penerangan diperlukan.")
  .max(10_000, "Penerangan terlalu panjang.");

const notesSchema = z
  .string()
  .trim()
  .min(1, "Nota tidak sah.")
  .max(2_000, "Nota terlalu panjang.");

const sourceReferenceSchema = z
  .string()
  .trim()
  .min(1, "Rujukan sumber tidak sah.")
  .max(2_048, "Rujukan sumber terlalu panjang.");

const sourceYearSchema = z
  .number()
  .int("Tahun sumber mestilah nombor bulat.")
  .min(1900, "Tahun sumber tidak sah.")
  .max(9_999, "Tahun sumber tidak sah.");

const yearLevelSchema = z
  .number()
  .int("Tahap tahun mestilah nombor bulat.")
  .min(1, "Tahap tahun tidak sah.")
  .max(100, "Tahap tahun tidak sah.");

const sequenceSchema = z
  .number()
  .int("Turutan mestilah nombor bulat.")
  .min(0, "Turutan tidak sah.")
  .max(100_000, "Turutan terlalu besar.");

const optionalSequenceSchema = sequenceSchema.nullable().optional();

const pageSchema = z.coerce.number().int().min(1).default(1);
const limitSchema = z.coerce.number().int().min(1).max(100).default(20);
const sortOrderSchema = z.enum(["asc", "desc"]);
const searchSchema = z
  .string()
  .trim()
  .min(1, "Carian tidak sah.")
  .max(150, "Carian terlalu panjang.");
const queryBooleanSchema = z
  .enum(["true", "false"])
  .transform((value) => value === "true");

const effectiveDateSchema = z.coerce.date();

export const versionIdParamsSchema = z
  .object({
    versionId: uuidSchema("ID versi kurikulum tidak sah."),
  })
  .strict();

export const subjectIdParamsSchema = z
  .object({
    subjectId: uuidSchema("ID subjek tidak sah."),
  })
  .strict();

export const programmeIdParamsSchema = z
  .object({
    programmeId: uuidSchema("ID program kurikulum tidak sah."),
  })
  .strict();

export const yearIdParamsSchema = z
  .object({
    yearId: uuidSchema("ID tahun kurikulum tidak sah."),
  })
  .strict();

export const structureIdParamsSchema = z
  .object({
    structureId: uuidSchema("ID struktur bahasa tidak sah."),
  })
  .strict();

export const skillIdParamsSchema = z
  .object({
    skillId: uuidSchema("ID kemahiran pemulihan tidak sah."),
  })
  .strict();

export const contentStandardIdParamsSchema = z
  .object({
    contentStandardId: uuidSchema("ID standard kandungan tidak sah."),
  })
  .strict();

export const learningStandardIdParamsSchema = z
  .object({
    learningStandardId: uuidSchema("ID standard pembelajaran tidak sah."),
  })
  .strict();

export const objectiveIdParamsSchema = z
  .object({
    objectiveId: uuidSchema("ID objektif pembelajaran tidak sah."),
  })
  .strict();

export const activityIdParamsSchema = z
  .object({
    activityId: uuidSchema("ID aktiviti pengajaran dicadangkan tidak sah."),
  })
  .strict();

export const skillLearningStandardParamsSchema = z
  .object({
    skillId: uuidSchema("ID kemahiran pemulihan tidak sah."),
    learningStandardId: uuidSchema("ID standard pembelajaran tidak sah."),
  })
  .strict();

export const createCurriculumVersionSchema = z
  .object({
    code: versionCodeSchema,
    name: nameSchema,
    description: optionalNullable(descriptionSchema),
    sourceYear: optionalNullable(sourceYearSchema),
    effectiveFrom: optionalNullable(effectiveDateSchema),
    effectiveTo: optionalNullable(effectiveDateSchema),
  })
  .strict()
  .superRefine((data, context) => {
    if (
      data.effectiveFrom !== undefined &&
      data.effectiveFrom !== null &&
      data.effectiveTo !== undefined &&
      data.effectiveTo !== null &&
      data.effectiveFrom > data.effectiveTo
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Tarikh mula kuat kuasa mestilah sebelum tarikh tamat.",
        path: ["effectiveTo"],
      });
    }
  });

export const updateCurriculumVersionSchema = z
  .object({
    code: versionCodeSchema.optional(),
    name: nameSchema.optional(),
    description: optionalNullable(descriptionSchema),
    sourceYear: optionalNullable(sourceYearSchema),
    effectiveFrom: optionalNullable(effectiveDateSchema),
    effectiveTo: optionalNullable(effectiveDateSchema),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: "Sekurang-kurangnya satu medan kemas kini diperlukan.",
  })
  .superRefine((data, context) => {
    if (
      data.effectiveFrom !== undefined &&
      data.effectiveFrom !== null &&
      data.effectiveTo !== undefined &&
      data.effectiveTo !== null &&
      data.effectiveFrom > data.effectiveTo
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Tarikh mula kuat kuasa mestilah sebelum tarikh tamat.",
        path: ["effectiveTo"],
      });
    }
  });

export const listCurriculumVersionsQuerySchema = z
  .object({
    page: pageSchema,
    limit: limitSchema,
    search: searchSchema.optional(),
    status: z.nativeEnum(CurriculumStatus).optional(),
    sourceYear: z.coerce
      .number()
      .int()
      .min(1900)
      .max(9_999)
      .optional(),
    sortBy: z
      .enum(["code", "name", "sourceYear", "status", "createdAt", "updatedAt"])
      .default("createdAt"),
    sortOrder: sortOrderSchema.default("desc"),
  })
  .strict();

export const createSubjectSchema = z
  .object({
    code: compactCodeSchema,
    name: nameSchema,
    description: optionalNullable(descriptionSchema),
    status: z.nativeEnum(CurriculumRecordStatus).optional(),
  })
  .strict();

export const updateSubjectSchema = z
  .object({
    code: compactCodeSchema.optional(),
    name: nameSchema.optional(),
    description: optionalNullable(descriptionSchema),
    status: z.nativeEnum(CurriculumRecordStatus).optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: "Sekurang-kurangnya satu medan kemas kini diperlukan.",
  });

export const listSubjectsQuerySchema = z
  .object({
    page: pageSchema,
    limit: limitSchema,
    search: searchSchema.optional(),
    status: z.nativeEnum(CurriculumRecordStatus).optional(),
    sortBy: z
      .enum(["code", "name", "status", "createdAt", "updatedAt"])
      .default("createdAt"),
    sortOrder: sortOrderSchema.default("desc"),
  })
  .strict();

export const createProgrammeSchema = z
  .object({
    curriculumVersionId: uuidSchema("ID versi kurikulum tidak sah."),
    subjectId: uuidSchema("ID subjek tidak sah."),
    code: compactCodeSchema,
    name: nameSchema,
    description: optionalNullable(descriptionSchema),
    status: z.nativeEnum(CurriculumRecordStatus).optional(),
  })
  .strict();

export const updateProgrammeSchema = z
  .object({
    subjectId: uuidSchema("ID subjek tidak sah.").optional(),
    code: compactCodeSchema.optional(),
    name: nameSchema.optional(),
    description: optionalNullable(descriptionSchema),
    status: z.nativeEnum(CurriculumRecordStatus).optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: "Sekurang-kurangnya satu medan kemas kini diperlukan.",
  });

export const listProgrammesQuerySchema = z
  .object({
    page: pageSchema,
    limit: limitSchema,
    curriculumVersionId: uuidSchema("ID versi kurikulum tidak sah.").optional(),
    subjectId: uuidSchema("ID subjek tidak sah.").optional(),
    search: searchSchema.optional(),
    status: z.nativeEnum(CurriculumRecordStatus).optional(),
    sortBy: z
      .enum(["code", "name", "status", "createdAt", "updatedAt"])
      .default("createdAt"),
    sortOrder: sortOrderSchema.default("desc"),
  })
  .strict();

export const createCurriculumYearSchema = z
  .object({
    yearLevel: yearLevelSchema,
    name: nameSchema,
    sequence: sequenceSchema,
    status: z.nativeEnum(CurriculumRecordStatus).optional(),
  })
  .strict();

export const updateCurriculumYearSchema = z
  .object({
    yearLevel: yearLevelSchema.optional(),
    name: nameSchema.optional(),
    sequence: sequenceSchema.optional(),
    status: z.nativeEnum(CurriculumRecordStatus).optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: "Sekurang-kurangnya satu medan kemas kini diperlukan.",
  });

export const listCurriculumYearsQuerySchema = z
  .object({
    page: pageSchema,
    limit: limitSchema,
    search: searchSchema.optional(),
    status: z.nativeEnum(CurriculumRecordStatus).optional(),
    sortBy: z
      .enum(["sequence", "yearLevel", "name", "status", "createdAt", "updatedAt"])
      .default("sequence"),
    sortOrder: sortOrderSchema.default("asc"),
  })
  .strict();

export const createLanguageStructureSchema = z
  .object({
    code: compactCodeSchema,
    name: nameSchema,
    description: optionalNullable(descriptionSchema),
    sequence: sequenceSchema,
    status: z.nativeEnum(CurriculumRecordStatus).optional(),
  })
  .strict();

export const updateLanguageStructureSchema = z
  .object({
    code: compactCodeSchema.optional(),
    name: nameSchema.optional(),
    description: optionalNullable(descriptionSchema),
    sequence: sequenceSchema.optional(),
    status: z.nativeEnum(CurriculumRecordStatus).optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: "Sekurang-kurangnya satu medan kemas kini diperlukan.",
  });

export const listLanguageStructuresQuerySchema = z
  .object({
    page: pageSchema,
    limit: limitSchema,
    search: searchSchema.optional(),
    status: z.nativeEnum(CurriculumRecordStatus).optional(),
    sortBy: z
      .enum(["sequence", "code", "name", "status", "createdAt", "updatedAt"])
      .default("sequence"),
    sortOrder: sortOrderSchema.default("asc"),
  })
  .strict();

export const createRemedialSkillSchema = z
  .object({
    languageStructureId: uuidSchema("ID struktur bahasa tidak sah."),
    code: compactCodeSchema,
    sequence: sequenceSchema,
    name: nameSchema,
    description: optionalNullable(descriptionSchema),
    isPreparatory: z.boolean().optional(),
    status: z.nativeEnum(CurriculumRecordStatus).optional(),
  })
  .strict();

export const updateRemedialSkillSchema = z
  .object({
    languageStructureId: uuidSchema("ID struktur bahasa tidak sah.").optional(),
    code: compactCodeSchema.optional(),
    sequence: sequenceSchema.optional(),
    name: nameSchema.optional(),
    description: optionalNullable(descriptionSchema),
    isPreparatory: z.boolean().optional(),
    status: z.nativeEnum(CurriculumRecordStatus).optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: "Sekurang-kurangnya satu medan kemas kini diperlukan.",
  });

export const listRemedialSkillsQuerySchema = z
  .object({
    page: pageSchema,
    limit: limitSchema,
    languageStructureId: uuidSchema("ID struktur bahasa tidak sah.").optional(),
    status: z.nativeEnum(CurriculumRecordStatus).optional(),
    isPreparatory: queryBooleanSchema.optional(),
    search: searchSchema.optional(),
    sortBy: z
      .enum(["sequence", "code", "name", "status", "createdAt", "updatedAt"])
      .default("sequence"),
    sortOrder: sortOrderSchema.default("asc"),
  })
  .strict();

export const createContentStandardSchema = z
  .object({
    curriculumYearId: uuidSchema("ID tahun kurikulum tidak sah."),
    code: curriculumCodeSchema,
    title: titleSchema,
    description: optionalNullable(descriptionSchema),
    domain: z.nativeEnum(CurriculumDomain),
    sequence: optionalSequenceSchema,
    status: z.nativeEnum(CurriculumRecordStatus).optional(),
  })
  .strict();

export const updateContentStandardSchema = z
  .object({
    curriculumYearId: uuidSchema("ID tahun kurikulum tidak sah.").optional(),
    code: curriculumCodeSchema.optional(),
    title: titleSchema.optional(),
    description: optionalNullable(descriptionSchema),
    domain: z.nativeEnum(CurriculumDomain).optional(),
    sequence: optionalSequenceSchema,
    status: z.nativeEnum(CurriculumRecordStatus).optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: "Sekurang-kurangnya satu medan kemas kini diperlukan.",
  });

export const listContentStandardsQuerySchema = z
  .object({
    page: pageSchema,
    limit: limitSchema,
    curriculumYearId: uuidSchema("ID tahun kurikulum tidak sah.").optional(),
    yearLevel: z.coerce.number().int().min(1).max(100).optional(),
    domain: z.nativeEnum(CurriculumDomain).optional(),
    status: z.nativeEnum(CurriculumRecordStatus).optional(),
    search: searchSchema.optional(),
    sortBy: z
      .enum(["sequence", "code", "title", "domain", "status", "createdAt", "updatedAt"])
      .default("sequence"),
    sortOrder: sortOrderSchema.default("asc"),
  })
  .strict();

export const createLearningStandardSchema = z
  .object({
    code: curriculumCodeSchema,
    description: descriptionSchema,
    sequence: optionalSequenceSchema,
    status: z.nativeEnum(CurriculumRecordStatus).optional(),
  })
  .strict();

export const updateLearningStandardSchema = z
  .object({
    code: curriculumCodeSchema.optional(),
    description: descriptionSchema.optional(),
    sequence: optionalSequenceSchema,
    status: z.nativeEnum(CurriculumRecordStatus).optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: "Sekurang-kurangnya satu medan kemas kini diperlukan.",
  });

export const listLearningStandardsQuerySchema = z
  .object({
    page: pageSchema,
    limit: limitSchema,
    status: z.nativeEnum(CurriculumRecordStatus).optional(),
    search: searchSchema.optional(),
    sortBy: z
      .enum(["sequence", "code", "status", "createdAt", "updatedAt"])
      .default("sequence"),
    sortOrder: sortOrderSchema.default("asc"),
  })
  .strict();

export const createSkillStandardMappingSchema = z
  .object({
    isPrimary: z.boolean().optional(),
    notes: optionalNullable(notesSchema),
  })
  .strict();

export const listSkillStandardMappingsQuerySchema = z
  .object({
    page: pageSchema,
    limit: limitSchema,
    isPrimary: queryBooleanSchema.optional(),
  })
  .strict();

export const createLearningObjectiveSchema = z
  .object({
    code: optionalNullable(curriculumCodeSchema),
    description: descriptionSchema,
    sequence: sequenceSchema,
    status: z.nativeEnum(CurriculumRecordStatus).optional(),
  })
  .strict();

export const updateLearningObjectiveSchema = z
  .object({
    code: optionalNullable(curriculumCodeSchema),
    description: descriptionSchema.optional(),
    sequence: sequenceSchema.optional(),
    status: z.nativeEnum(CurriculumRecordStatus).optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: "Sekurang-kurangnya satu medan kemas kini diperlukan.",
  });

export const listLearningObjectivesQuerySchema = z
  .object({
    page: pageSchema,
    limit: limitSchema,
    status: z.nativeEnum(CurriculumRecordStatus).optional(),
    sortBy: z
      .enum(["sequence", "code", "status", "createdAt", "updatedAt"])
      .default("sequence"),
    sortOrder: sortOrderSchema.default("asc"),
  })
  .strict();

export const createSuggestedTeachingActivitySchema = z
  .object({
    learningObjectiveId: optionalNullable(
      uuidSchema("ID objektif pembelajaran tidak sah."),
    ),
    title: optionalNullable(titleSchema),
    description: descriptionSchema,
    sequence: sequenceSchema,
    sourceReference: optionalNullable(sourceReferenceSchema),
    status: z.nativeEnum(CurriculumRecordStatus).optional(),
  })
  .strict();

export const updateSuggestedTeachingActivitySchema = z
  .object({
    learningObjectiveId: optionalNullable(
      uuidSchema("ID objektif pembelajaran tidak sah."),
    ),
    title: optionalNullable(titleSchema),
    description: descriptionSchema.optional(),
    sequence: sequenceSchema.optional(),
    sourceReference: optionalNullable(sourceReferenceSchema),
    status: z.nativeEnum(CurriculumRecordStatus).optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: "Sekurang-kurangnya satu medan kemas kini diperlukan.",
  });

export const listSuggestedTeachingActivitiesQuerySchema = z
  .object({
    page: pageSchema,
    limit: limitSchema,
    status: z.nativeEnum(CurriculumRecordStatus).optional(),
    sortBy: z
      .enum(["sequence", "title", "status", "createdAt", "updatedAt"])
      .default("sequence"),
    sortOrder: sortOrderSchema.default("asc"),
  })
  .strict();

export const curriculumTreeQuerySchema = z
  .object({
    include: z.enum(["summary", "full"]).default("summary"),
  })
  .strict();

export type CreateCurriculumVersionRequest = z.infer<
  typeof createCurriculumVersionSchema
>;
export type UpdateCurriculumVersionRequest = z.infer<
  typeof updateCurriculumVersionSchema
>;
export type ListCurriculumVersionsQuery = z.infer<
  typeof listCurriculumVersionsQuerySchema
>;
export type CreateSubjectRequest = z.infer<typeof createSubjectSchema>;
export type UpdateSubjectRequest = z.infer<typeof updateSubjectSchema>;
export type ListSubjectsQuery = z.infer<typeof listSubjectsQuerySchema>;
export type CreateProgrammeRequest = z.infer<typeof createProgrammeSchema>;
export type UpdateProgrammeRequest = z.infer<typeof updateProgrammeSchema>;
export type ListProgrammesQuery = z.infer<typeof listProgrammesQuerySchema>;
export type CreateCurriculumYearRequest = z.infer<
  typeof createCurriculumYearSchema
>;
export type UpdateCurriculumYearRequest = z.infer<
  typeof updateCurriculumYearSchema
>;
export type ListCurriculumYearsQuery = z.infer<
  typeof listCurriculumYearsQuerySchema
>;
export type CreateLanguageStructureRequest = z.infer<
  typeof createLanguageStructureSchema
>;
export type UpdateLanguageStructureRequest = z.infer<
  typeof updateLanguageStructureSchema
>;
export type ListLanguageStructuresQuery = z.infer<
  typeof listLanguageStructuresQuerySchema
>;
export type CreateRemedialSkillRequest = z.infer<
  typeof createRemedialSkillSchema
>;
export type UpdateRemedialSkillRequest = z.infer<
  typeof updateRemedialSkillSchema
>;
export type ListRemedialSkillsQuery = z.infer<
  typeof listRemedialSkillsQuerySchema
>;
export type CreateContentStandardRequest = z.infer<
  typeof createContentStandardSchema
>;
export type UpdateContentStandardRequest = z.infer<
  typeof updateContentStandardSchema
>;
export type ListContentStandardsQuery = z.infer<
  typeof listContentStandardsQuerySchema
>;
export type CreateLearningStandardRequest = z.infer<
  typeof createLearningStandardSchema
>;
export type UpdateLearningStandardRequest = z.infer<
  typeof updateLearningStandardSchema
>;
export type ListLearningStandardsQuery = z.infer<
  typeof listLearningStandardsQuerySchema
>;
export type CreateSkillStandardMappingRequest = z.infer<
  typeof createSkillStandardMappingSchema
>;
export type ListSkillStandardMappingsQuery = z.infer<
  typeof listSkillStandardMappingsQuerySchema
>;
export type CreateLearningObjectiveRequest = z.infer<
  typeof createLearningObjectiveSchema
>;
export type UpdateLearningObjectiveRequest = z.infer<
  typeof updateLearningObjectiveSchema
>;
export type ListLearningObjectivesQuery = z.infer<
  typeof listLearningObjectivesQuerySchema
>;
export type CreateSuggestedTeachingActivityRequest = z.infer<
  typeof createSuggestedTeachingActivitySchema
>;
export type UpdateSuggestedTeachingActivityRequest = z.infer<
  typeof updateSuggestedTeachingActivitySchema
>;
export type ListSuggestedTeachingActivitiesQuery = z.infer<
  typeof listSuggestedTeachingActivitiesQuerySchema
>;
export type CurriculumTreeQuery = z.infer<typeof curriculumTreeQuerySchema>;
