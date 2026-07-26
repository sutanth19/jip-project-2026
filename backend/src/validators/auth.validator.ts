import { z } from "zod";
import { UserRole } from "@prisma/client";

export const loginSchema = z.object({
  role: z.nativeEnum(UserRole),

  loginId: z
    .string()
    .trim()
    .min(3, "Login ID must be at least 3 characters."),

  password: z
    .string()
    .min(1, "Password is required."),

  rememberMe: z
    .boolean()
    .optional()
    .default(false),
});

export const setupPasswordSchema = z.object({
  token: z
    .string()
    .min(1, "Token is required."),

  password: z
    .string()
    .min(8, "Password must be at least 8 characters."),
});

export const changeFirstPasswordSchema = z.object({
  currentPassword: z
    .string()
    .min(1, "Current password is required."),

  newPassword: z
    .string()
    .min(8, "Password must be at least 8 characters.")
    .max(128, "Password must not exceed 128 characters."),

  confirmPassword: z
    .string()
    .min(1, "Password confirmation is required."),
});

const pinSchema = z
  .string()
  .regex(/^\d{4}$/, "PIN mesti mempunyai tepat empat digit.");

export const studentLoginSchema = z.object({
  schoolId: z.string().uuid("School ID tidak sah."),
  studentId: z
    .string()
    .trim()
    .min(2, "ID murid mestilah sekurang-kurangnya dua aksara."),
  pin: pinSchema,
});

export const changeFirstPinSchema = z.object({
  currentPin: pinSchema,
  newPin: pinSchema,
  confirmPin: pinSchema,
});
