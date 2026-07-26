import { z } from "zod";

import { isValidMalaysianPhone } from "../utils/phone.js";

const fullNameSchema = z.string().trim().min(3, "Nama penuh diperlukan.").max(150, "Nama penuh terlalu panjang.");
const phoneSchema = z.string().trim().refine(isValidMalaysianPhone, "Nombor telefon Malaysia tidak sah.");
const positionSchema = z.string().trim().min(1, "Jawatan tidak sah.").max(100, "Jawatan terlalu panjang.");
const optionalText = (max: number, message: string) => z.string().trim().min(1, message).max(max, message);

const nonEmpty = <TSchema extends z.ZodType>(schema: TSchema) => schema.refine((value) => Object.keys(value as object).length > 0, { message: "Sekurang-kurangnya satu medan kemas kini diperlukan." });

export const adminProfileUpdateSchema = nonEmpty(z.object({
  fullName: fullNameSchema.optional(),
  phone: phoneSchema.nullable().optional(),
  position: positionSchema.nullable().optional(),
}).strict());

export const teacherProfileUpdateSchema = nonEmpty(z.object({
  fullName: fullNameSchema.optional(),
  phone: phoneSchema.nullable().optional(),
  position: positionSchema.nullable().optional(),
}).strict());

export const parentProfileUpdateSchema = nonEmpty(z.object({
  fullName: fullNameSchema.optional(),
  phone: phoneSchema.optional(),
  occupation: optionalText(100, "Pekerjaan tidak sah.").nullable().optional(),
  address: optionalText(500, "Alamat tidak sah.").nullable().optional(),
}).strict());

export const studentProfileUpdateSchema = z.object({}).strict();

export const avatarUpdateSchema = z.object({
  mediaKey: z.string().trim().min(1, "Kunci media tidak sah.").max(512, "Kunci media terlalu panjang.").nullable(),
}).strict();

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Kata laluan semasa diperlukan."),
  newPassword: z.string().min(8, "Kata laluan mesti sekurang-kurangnya 8 aksara.").max(128, "Kata laluan terlalu panjang."),
  confirmPassword: z.string().min(1, "Pengesahan kata laluan diperlukan."),
}).strict();

const pinSchema = z.string().regex(/^\d{4}$/, "PIN mesti mempunyai tepat empat digit.");
export const changePinSchema = z.object({
  currentPin: pinSchema,
  newPin: pinSchema,
  confirmPin: pinSchema,
}).strict();

export type AdminProfileUpdateRequest = z.infer<typeof adminProfileUpdateSchema>;
export type TeacherProfileUpdateRequest = z.infer<typeof teacherProfileUpdateSchema>;
export type ParentProfileUpdateRequest = z.infer<typeof parentProfileUpdateSchema>;
export type AvatarUpdateRequest = z.infer<typeof avatarUpdateSchema>;
export type ChangePasswordRequest = z.infer<typeof changePasswordSchema>;
export type ChangePinRequest = z.infer<typeof changePinSchema>;
