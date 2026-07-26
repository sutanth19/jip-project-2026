import { AccountStatus } from "@prisma/client";
import { z } from "zod";

import { isValidMalaysianPhone } from "../utils/phone.js";

const schoolCodeSchema = z
  .string()
  .trim()
  .min(2, "Kod sekolah diperlukan.")
  .max(30, "Kod sekolah terlalu panjang.")
  .regex(/^[A-Za-z0-9_-]+$/, "Kod sekolah hanya boleh mengandungi huruf, nombor, sempang dan garis bawah.");

const schoolNameSchema = z
  .string()
  .trim()
  .min(3, "Nama sekolah diperlukan.")
  .max(150, "Nama sekolah terlalu panjang.");

const principalNameSchema = z
  .string()
  .trim()
  .min(1, "Nama pengetua tidak sah.")
  .max(150, "Nama pengetua terlalu panjang.");

const addressSchema = z
  .string()
  .trim()
  .min(5, "Alamat diperlukan.")
  .max(500, "Alamat terlalu panjang.");

const phoneSchema = z
  .string()
  .trim()
  .refine(isValidMalaysianPhone, "Nombor telefon Malaysia tidak sah.");

const contactEmailSchema = z
  .string()
  .trim()
  .email("E-mel perhubungan tidak sah.")
  .max(254, "E-mel perhubungan terlalu panjang.");

const logoSchema = z
  .string()
  .trim()
  .min(1, "Logo tidak sah.")
  .max(2_048, "Laluan logo terlalu panjang.")
  .refine(
    (value) => value.startsWith("/") || /^https?:\/\//i.test(value),
    "Logo mestilah URL atau laluan yang sah.",
  );

export const createSchoolSchema = z
  .object({
    schoolCode: schoolCodeSchema,
    schoolName: schoolNameSchema,
    principalName: principalNameSchema.optional(),
    address: addressSchema,
    phone: phoneSchema,
    contactEmail: contactEmailSchema.optional(),
    logo: logoSchema.optional(),
  })
  .strict();

export const schoolIdParamsSchema = z
  .object({
    schoolId: z.string().uuid("ID sekolah tidak sah."),
  })
  .strict();

const optionalNullable = <T extends z.ZodType>(schema: T) =>
  schema.nullable().optional();

export const updateSchoolSchema = z
  .object({
    schoolCode: schoolCodeSchema.optional(),
    schoolName: schoolNameSchema.optional(),
    principalName: optionalNullable(principalNameSchema),
    address: addressSchema.optional(),
    phone: phoneSchema.optional(),
    contactEmail: optionalNullable(contactEmailSchema),
    logo: optionalNullable(logoSchema),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: "Sekurang-kurangnya satu medan kemas kini diperlukan.",
  });

export const updateSchoolStatusSchema = z
  .object({
    status: z.enum([
      AccountStatus.ACTIVE,
      AccountStatus.SUSPENDED,
      AccountStatus.ARCHIVED,
    ]),
  })
  .strict();

export const listSchoolsQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(10),
    search: z.string().trim().max(150).optional(),
    status: z.nativeEnum(AccountStatus).optional(),
    sortBy: z
      .enum(["schoolCode", "schoolName", "accountStatus", "createdAt", "updatedAt"])
      .default("createdAt"),
    sortOrder: z.enum(["asc", "desc"]).default("desc"),
  })
  .strict();

export type CreateSchoolRequest = z.infer<typeof createSchoolSchema>;
export type UpdateSchoolRequest = z.infer<typeof updateSchoolSchema>;
export type UpdateSchoolStatusRequest = z.infer<
  typeof updateSchoolStatusSchema
>;
export type ListSchoolsQuery = z.infer<typeof listSchoolsQuerySchema>;
