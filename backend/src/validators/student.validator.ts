import { AccountStatus, Gender, ParentRelationship } from "@prisma/client";
import { z } from "zod";

const studentIdSchema = z
  .string()
  .trim()
  .min(2, "ID murid diperlukan.")
  .max(30, "ID murid terlalu panjang.")
  .regex(/^[A-Za-z0-9_-]+$/, "ID murid hanya boleh mengandungi huruf, nombor, sempang dan garis bawah.")
  .transform((value) => value.toUpperCase());

const fullNameSchema = z
  .string()
  .trim()
  .min(3, "Nama penuh diperlukan.")
  .max(150, "Nama penuh terlalu panjang.");

const avatarSchema = z
  .string()
  .trim()
  .min(1, "Avatar tidak sah.")
  .max(2_048, "Laluan avatar terlalu panjang.")
  .refine(
    (value) => value.startsWith("/") || /^https?:\/\//i.test(value),
    "Avatar mestilah URL atau laluan yang sah.",
  );

const birthDateSchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Tarikh lahir mestilah dalam format YYYY-MM-DD.")
  .refine((value) => {
    const date = new Date(`${value}T00:00:00.000Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
  }, "Tarikh lahir tidak sah.")
  .refine((value) => value <= new Date().toISOString().slice(0, 10), "Tarikh lahir tidak boleh pada masa hadapan.");

export const studentProfileIdParamsSchema = z.object({
  studentProfileId: z.string().uuid("ID profil murid tidak sah."),
}).strict();

export const studentParentParamsSchema = studentProfileIdParamsSchema.extend({
  parentId: z.string().uuid("ID ibu bapa tidak sah."),
}).strict();

export const createStudentSchema = z.object({
  schoolId: z.string().uuid("ID sekolah tidak sah."),
  classId: z.string().uuid("ID kelas tidak sah."),
  studentId: studentIdSchema,
  fullName: fullNameSchema,
  gender: z.nativeEnum(Gender),
  birthDate: birthDateSchema.optional(),
  avatar: avatarSchema.optional(),
}).strict();

export const createTeacherStudentSchema = z.object({
  classId: z.string().uuid("ID kelas tidak sah."),
  fullName: fullNameSchema,
  yearLevel: z.coerce.number().int().min(1, "Tahun tidak sah.").max(6, "Tahun tidak sah."),
  gender: z.nativeEnum(Gender),
}).strict();

export const updateStudentSchema = z.object({
  studentId: studentIdSchema.optional(),
  fullName: fullNameSchema.optional(),
  classId: z.string().uuid("ID kelas tidak sah.").optional(),
  yearLevel: z.coerce.number().int().min(1, "Tahun tidak sah.").max(6, "Tahun tidak sah.").optional(),
  gender: z.nativeEnum(Gender).optional(),
  birthDate: birthDateSchema.nullable().optional(),
  avatar: avatarSchema.nullable().optional(),
}).strict().refine((data) => Object.keys(data).length > 0, {
  message: "Sekurang-kurangnya satu medan kemas kini diperlukan.",
}).refine((data) => Boolean(data.classId) === Boolean(data.yearLevel), {
  message: "Tahun dan kelas asal mesti dipilih bersama.",
});

export const updateStudentStatusSchema = z.object({
  status: z.enum([AccountStatus.ACTIVE, AccountStatus.SUSPENDED, AccountStatus.ARCHIVED]),
}).strict();

export const transferStudentClassSchema = z.object({
  classId: z.string().uuid("ID kelas tidak sah."),
}).strict();

export const linkStudentParentSchema = z.object({
  relationship: z.nativeEnum(ParentRelationship),
}).strict();

export const listStudentsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().trim().min(1).max(150).optional(),
  status: z.nativeEnum(AccountStatus).optional(),
  schoolId: z.string().uuid("ID sekolah tidak sah.").optional(),
  classId: z.string().uuid("ID kelas tidak sah.").optional(),
  yearLevel: z.coerce.number().int().min(1).max(20).optional(),
  gender: z.nativeEnum(Gender).optional(),
  sortBy: z.enum(["studentId", "fullName", "accountStatus", "createdAt", "updatedAt", "birthDate"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
}).strict();

export type CreateStudentRequest = z.infer<typeof createStudentSchema>;
export type CreateTeacherStudentRequest = z.infer<typeof createTeacherStudentSchema>;
export type UpdateStudentRequest = z.infer<typeof updateStudentSchema>;
export type ListStudentsQuery = z.infer<typeof listStudentsQuerySchema>;
