import { AccountStatus, ParentRelationship } from "@prisma/client";
import { z } from "zod";

import { isValidMalaysianPhone } from "../utils/phone.js";

const fullNameSchema = z.string().trim().min(3, "Nama penuh diperlukan.").max(150, "Nama penuh terlalu panjang.");
const emailSchema = z.string().trim().email("E-mel tidak sah.").max(254, "E-mel terlalu panjang.");
const phoneSchema = z.string().trim().refine(isValidMalaysianPhone, "Nombor telefon Malaysia tidak sah.");
const optionalText = (max: number, message: string) => z.string().trim().min(1, message).max(max, message);
const avatarSchema = z.string().trim().min(1, "Avatar tidak sah.").max(2_048, "Laluan avatar terlalu panjang.")
  .refine((value) => value.startsWith("/") || /^https?:\/\//i.test(value), "Avatar mestilah URL atau laluan yang sah.");

export const parentIdParamsSchema = z.object({
  parentId: z.string().uuid("ID ibu bapa tidak sah."),
}).strict();

export const parentStudentParamsSchema = parentIdParamsSchema.extend({
  studentId: z.string().uuid("ID murid tidak sah."),
}).strict();

export const createParentSchema = z.object({
  fullName: fullNameSchema,
  phone: phoneSchema,
  email: emailSchema.optional(),
  occupation: optionalText(100, "Pekerjaan tidak sah.").optional(),
  address: optionalText(500, "Alamat tidak sah.").optional(),
  avatar: avatarSchema.optional(),
}).strict();

export const updateParentSchema = z.object({
  fullName: fullNameSchema.optional(),
  phone: phoneSchema.optional(),
  email: emailSchema.nullable().optional(),
  occupation: optionalText(100, "Pekerjaan tidak sah.").nullable().optional(),
  address: optionalText(500, "Alamat tidak sah.").nullable().optional(),
  avatar: avatarSchema.nullable().optional(),
}).strict().refine((data) => Object.keys(data).length > 0, {
  message: "Sekurang-kurangnya satu medan kemas kini diperlukan.",
});

export const updateParentStatusSchema = z.object({
  status: z.enum([AccountStatus.ACTIVE, AccountStatus.SUSPENDED, AccountStatus.ARCHIVED]),
}).strict();

export const listParentsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().trim().max(150).optional(),
  status: z.nativeEnum(AccountStatus).optional(),
  sortBy: z.enum(["fullName", "phone", "email", "occupation", "accountStatus", "createdAt", "updatedAt"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
}).strict();

export const linkParentStudentSchema = z.object({
  relationship: z.nativeEnum(ParentRelationship),
}).strict();

export type CreateParentRequest = z.infer<typeof createParentSchema>;
export type UpdateParentRequest = z.infer<typeof updateParentSchema>;
export type ListParentsQuery = z.infer<typeof listParentsQuerySchema>;
export type LinkParentStudentRequest = z.infer<typeof linkParentStudentSchema>;
