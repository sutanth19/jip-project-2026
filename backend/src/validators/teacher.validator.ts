import { AccountStatus, Gender, TeacherPermission } from "@prisma/client";
import { z } from "zod";

import { isValidMalaysianPhone } from "../utils/phone.js";

const teacherIdSchema = z
  .string()
  .trim()
  .min(2, "ID guru diperlukan.")
  .max(50, "ID guru terlalu panjang.")
  .regex(/^[A-Za-z0-9_-]+$/, "ID guru hanya boleh mengandungi huruf, nombor, sempang dan garis bawah.");

const fullNameSchema = z
  .string()
  .trim()
  .min(3, "Nama penuh diperlukan.")
  .max(150, "Nama penuh terlalu panjang.");

const emailSchema = z
  .string()
  .trim()
  .email("E-mel tidak sah.")
  .max(254, "E-mel terlalu panjang.");

const phoneSchema = z
  .string()
  .trim()
  .refine(isValidMalaysianPhone, "Nombor telefon Malaysia tidak sah.");

const positionSchema = z
  .string()
  .trim()
  .min(1, "Jawatan tidak sah.")
  .max(100, "Jawatan terlalu panjang.");

const avatarSchema = z
  .string()
  .trim()
  .min(1, "Avatar tidak sah.")
  .max(2_048, "Laluan avatar terlalu panjang.")
  .refine(
    (value) => value.startsWith("/") || /^https?:\/\//i.test(value),
    "Avatar mestilah URL atau laluan yang sah.",
  );

export const createTeacherSchema = z
  .object({
    schoolId: z.string().uuid("ID sekolah tidak sah."),
    teacherId: teacherIdSchema.optional(),
    fullName: fullNameSchema,
    gender: z.nativeEnum(Gender).default(Gender.FEMALE),
    email: emailSchema,
    phone: phoneSchema.optional(),
    position: positionSchema.optional(),
    avatar: avatarSchema.optional(),
  })
  .strict();

export const teacherIdParamsSchema = z
  .object({
    teacherId: z.string().uuid("ID guru tidak sah."),
  })
  .strict();

export const teacherGrantParamsSchema = teacherIdParamsSchema
  .extend({
    grantId: z.string().uuid("ID kebenaran guru tidak sah."),
  })
  .strict();

export const updateTeacherSchema = z
  .object({
    schoolId: z.string().uuid("ID sekolah tidak sah.").optional(),
    fullName: fullNameSchema.optional(),
    email: emailSchema.optional(),
    phone: phoneSchema.nullable().optional(),
    position: positionSchema.nullable().optional(),
    avatar: avatarSchema.nullable().optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: "Sekurang-kurangnya satu medan kemas kini diperlukan.",
  });

export const updateTeacherStatusSchema = z
  .object({
    status: z.enum([
      AccountStatus.ACTIVE,
      AccountStatus.SUSPENDED,
      AccountStatus.ARCHIVED,
    ]),
  })
  .strict();

export const listTeachersQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(10),
    search: z.string().trim().max(150).optional(),
    status: z.nativeEnum(AccountStatus).optional(),
    schoolId: z.string().uuid("ID sekolah tidak sah.").optional(),
    position: z.string().trim().min(1).max(100).optional(),
    sortBy: z
      .enum(["teacherId", "fullName", "email", "accountStatus", "createdAt", "updatedAt"])
      .default("createdAt"),
    sortOrder: z.enum(["asc", "desc"]).default("desc"),
  })
  .strict();

export const createTeacherGrantSchema = z
  .object({
    permission: z.literal(TeacherPermission.CREATE_TEACHER),
    expiresAt: z.coerce.date().optional(),
    maxUses: z.coerce.number().int().min(1).max(100).default(1),
  })
  .strict()
  .superRefine((data, context) => {
    if (data.expiresAt && data.expiresAt <= new Date()) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Tarikh tamat mestilah pada masa hadapan.",
        path: ["expiresAt"],
      });
    }
  });

export type CreateTeacherRequest = z.infer<typeof createTeacherSchema>;
export type UpdateTeacherRequest = z.infer<typeof updateTeacherSchema>;
export type ListTeachersQuery = z.infer<typeof listTeachersQuerySchema>;
export type CreateTeacherGrantRequest = z.infer<typeof createTeacherGrantSchema>;
