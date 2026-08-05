import { z } from "zod";
const uuid = (message: string) => z.string().trim().uuid(message);
const date = z.coerce.date();
export const studentReportParamsSchema = z.object({ studentId: uuid("ID murid tidak sah.") }).strict();
export const teacherReportParamsSchema = z.object({ teacherId: uuid("ID guru tidak sah.") }).strict();
export const classReportParamsSchema = z.object({ classId: uuid("ID kelas tidak sah.") }).strict();
export const schoolReportParamsSchema = z.object({ schoolId: uuid("ID sekolah tidak sah.") }).strict();
export const reportFiltersSchema = z.object({ schoolId: uuid("ID sekolah tidak sah.").optional(), teacherId: uuid("ID guru tidak sah.").optional(), classId: uuid("ID kelas tidak sah.").optional(), studentId: uuid("ID murid tidak sah.").optional(), programmeId: uuid("ID program tidak sah.").optional(), curriculumVersionId: uuid("ID versi kurikulum tidak sah.").optional(), remedialSkillId: uuid("ID kemahiran pemulihan tidak sah.").optional(), learningStandardId: uuid("ID standard pembelajaran tidak sah.").optional(), dateFrom: date.optional(), dateTo: date.optional(), academicYear: z.coerce.number().int().min(2000).max(2200).optional(), page: z.coerce.number().int().min(1).default(1), limit: z.coerce.number().int().min(1).max(100).default(20), sortBy: z.enum(["name", "createdAt", "percentage", "updatedAt"]).default("name"), sortOrder: z.enum(["asc", "desc"]).default("asc") }).strict().superRefine((value, context) => { if (value.dateFrom && value.dateTo && value.dateFrom > value.dateTo) context.addIssue({ code: "custom", path: ["dateTo"], message: "Tarikh akhir mesti selepas tarikh mula." }); });
export type ReportFilters = z.infer<typeof reportFiltersSchema>;
