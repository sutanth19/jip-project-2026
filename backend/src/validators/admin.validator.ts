import { AccountStatus } from "@prisma/client";
import { z } from "zod";

import { isValidMalaysianPhone } from "../utils/phone.js";

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

const optionalNullable = <T extends z.ZodType>(schema: T) =>
  schema.nullable().optional();

export const createAdminSchema = z
  .object({
    fullName: fullNameSchema,
    email: emailSchema,
    phone: phoneSchema.optional(),
    position: positionSchema.optional(),
    avatar: avatarSchema.optional(),
  })
  .strict();

export const adminIdParamsSchema = z
  .object({
    adminId: z.string().uuid("ID pentadbir tidak sah."),
  })
  .strict();

export const updateAdminSchema = z
  .object({
    fullName: fullNameSchema.optional(),
    email: emailSchema.optional(),
    phone: optionalNullable(phoneSchema),
    position: optionalNullable(positionSchema),
    avatar: optionalNullable(avatarSchema),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: "Sekurang-kurangnya satu medan kemas kini diperlukan.",
  });

export const updateAdminStatusSchema = z
  .object({
    status: z.enum([
      AccountStatus.ACTIVE,
      AccountStatus.SUSPENDED,
      AccountStatus.ARCHIVED,
    ]),
  })
  .strict();

export const listAdminsQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(10),
    search: z.string().trim().max(150).optional(),
    status: z.nativeEnum(AccountStatus).optional(),
    sortBy: z
      .enum(["fullName", "email", "accountStatus", "createdAt", "updatedAt"])
      .default("createdAt"),
    sortOrder: z.enum(["asc", "desc"]).default("desc"),
  })
  .strict();

export type CreateAdminRequest = z.infer<typeof createAdminSchema>;
export type UpdateAdminRequest = z.infer<typeof updateAdminSchema>;
export type ListAdminsQuery = z.infer<typeof listAdminsQuerySchema>;
