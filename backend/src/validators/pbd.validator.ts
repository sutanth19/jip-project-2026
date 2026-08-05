import { EvidenceStrength, EvidenceType, MasteryLevel, MasteryStatus, ProgressTrend } from "@prisma/client";
import { z } from "zod";

const uuid = (message: string) => z.string().trim().uuid(message);
const text = (max: number, label: string, required = true) => (required ? z.string().trim().min(1, `${label} diperlukan.`) : z.string().trim()).max(max, `${label} terlalu panjang.`).refine((value) => !/<\s*\/?\s*[a-z][^>]*>/i.test(value), `${label} mesti teks biasa yang selamat.`);
const date = z.coerce.date();
const page = z.coerce.number().int().min(1).default(1);
const limit = z.coerce.number().int().min(1).max(100).default(20);

export const evidenceIdParamsSchema = z.object({ evidenceId: uuid("ID bukti PBD tidak sah.") }).strict();
export const masteryIdParamsSchema = z.object({ masteryId: uuid("ID penguasaan tidak sah.") }).strict();
export const skillParamsSchema = z.object({ remedialSkillId: uuid("ID kemahiran pemulihan tidak sah.") }).strict();
export const classParamsSchema = z.object({ classId: uuid("ID kelas tidak sah.") }).strict();
export const parentProgressParamsSchema = z.object({ studentId: uuid("ID murid tidak sah.") }).strict();
export const observationSchema = z.object({ studentId: uuid("ID murid tidak sah."), remedialSkillId: uuid("ID kemahiran pemulihan tidak sah."), learningStandardId: uuid("ID standard pembelajaran tidak sah.").nullable(), learningObjectiveId: uuid("ID objektif pembelajaran tidak sah.").nullable(), strength: z.nativeEnum(EvidenceStrength).default(EvidenceStrength.STANDARD), observedLevel: z.nativeEnum(MasteryLevel), summary: text(2_000, "Ringkasan"), observedAt: date }).strict();
export const decisionSchema = z.object({ level: z.nativeEnum(MasteryLevel), reason: text(2_000, "Sebab"), teacherNote: text(4_000, "Nota guru", false).nullable().optional() }).strict();
export const invalidateEvidenceSchema = z.object({ reason: text(2_000, "Sebab pembatalan", false).nullable().optional() }).strict();
export const emptyBodySchema = z.object({}).strict();

const baseFilters = { page, limit, search: z.string().trim().min(1).max(200).optional(), studentId: uuid("ID murid tidak sah.").optional(), schoolId: uuid("ID sekolah tidak sah.").optional(), classId: uuid("ID kelas tidak sah.").optional(), curriculumVersionId: uuid("ID versi kurikulum tidak sah.").optional(), programmeId: uuid("ID program tidak sah.").optional(), remedialSkillId: uuid("ID kemahiran pemulihan tidak sah.").optional(), learningStandardId: uuid("ID standard pembelajaran tidak sah.").optional(), sortOrder: z.enum(["asc", "desc"]).default("desc") };
export const listEvidenceQuerySchema = z.object({ ...baseFilters, teacherId: uuid("ID guru tidak sah.").optional(), evidenceType: z.nativeEnum(EvidenceType).optional(), strength: z.nativeEnum(EvidenceStrength).optional(), isValid: z.enum(["true", "false"]).transform((value) => value === "true").optional(), observedFrom: date.optional(), observedTo: date.optional(), sortBy: z.enum(["observedAt", "createdAt", "percentage"]).default("observedAt") }).strict();
export const listMasteryQuerySchema = z.object({ ...baseFilters, currentLevel: z.nativeEnum(MasteryLevel).optional(), recommendedLevel: z.nativeEnum(MasteryLevel).optional(), status: z.nativeEnum(MasteryStatus).optional(), trend: z.nativeEnum(ProgressTrend).optional(), updatedFrom: date.optional(), updatedTo: date.optional(), sortBy: z.enum(["updatedAt", "latestEvidenceAt", "currentLevel", "recommendedConfidence"]).default("updatedAt") }).strict();
export type ObservationInput = z.infer<typeof observationSchema>;
export type DecisionInput = z.infer<typeof decisionSchema>;
export type InvalidateEvidenceInput = z.infer<typeof invalidateEvidenceSchema>;
export type ListEvidenceQuery = z.infer<typeof listEvidenceQuerySchema>;
export type ListMasteryQuery = z.infer<typeof listMasteryQuerySchema>;
