import { AccountStatus, Gender } from "@prisma/client";
import { z } from "zod";

const classNameSchema = z.string().trim().min(2, "Nama kelas diperlukan.").max(100, "Nama kelas terlalu panjang.");
const yearLevelSchema = z.coerce.number().int().min(1, "Tahun mesti antara 1 hingga 3.").max(3, "Tahun mesti antara 1 hingga 3.");
const academicYearSchema = z.coerce.number().int().min(2020, "Tahun akademik tidak sah.").max(2100, "Tahun akademik tidak sah.");
const capacitySchema = z.coerce.number().int().min(1, "Kapasiti minimum ialah 1.").max(100, "Kapasiti maksimum ialah 100.");

export const classIdParamsSchema = z.object({ classId: z.string().uuid("ID kelas tidak sah.") }).strict();
export const classStudentParamsSchema = classIdParamsSchema.extend({ studentId: z.string().uuid("ID murid tidak sah.") }).strict();

export const createSchoolClassSchema = z.object({
  schoolId: z.string().uuid("ID sekolah tidak sah."),
  teacherId: z.string().uuid("ID guru tidak sah."),
  className: classNameSchema,
  yearLevel: yearLevelSchema,
  academicYear: academicYearSchema,
  capacity: capacitySchema.optional(),
}).strict();

export const listSchoolClassesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().trim().min(1).max(150).optional(),
  status: z.enum([AccountStatus.ACTIVE, AccountStatus.SUSPENDED, AccountStatus.ARCHIVED]).optional(),
  schoolId: z.string().uuid("ID sekolah tidak sah.").optional(),
  teacherId: z.string().uuid("ID guru tidak sah.").optional(),
  yearLevel: yearLevelSchema.optional(),
  academicYear: academicYearSchema.optional(),
  sortBy: z.enum(["className", "yearLevel", "academicYear", "accountStatus", "createdAt", "updatedAt"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
}).strict();

export const updateSchoolClassSchema = z.object({
  className: classNameSchema.optional(),
  yearLevel: yearLevelSchema.optional(),
  academicYear: academicYearSchema.optional(),
  capacity: capacitySchema.nullable().optional(),
}).strict().refine((data) => Object.keys(data).length > 0, { message: "Sekurang-kurangnya satu medan kemas kini diperlukan." });

export const updateSchoolClassStatusSchema = z.object({
  status: z.enum([AccountStatus.ACTIVE, AccountStatus.SUSPENDED, AccountStatus.ARCHIVED]),
}).strict();

export const assignSchoolClassTeacherSchema = z.object({ teacherId: z.string().uuid("ID guru tidak sah.") }).strict();

export const listClassStudentsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().trim().min(1).max(150).optional(),
  status: z.enum([AccountStatus.ACTIVE, AccountStatus.SUSPENDED, AccountStatus.ARCHIVED]).optional(),
  gender: z.nativeEnum(Gender).optional(),
  sortBy: z.enum(["studentId", "fullName", "accountStatus", "createdAt", "updatedAt", "birthDate"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
}).strict();

export type CreateSchoolClassRequest = z.infer<typeof createSchoolClassSchema>;
export type ListSchoolClassesQuery = z.infer<typeof listSchoolClassesQuerySchema>;
export type UpdateSchoolClassRequest = z.infer<typeof updateSchoolClassSchema>;
export type ListClassStudentsQuery = z.infer<typeof listClassStudentsQuerySchema>;
