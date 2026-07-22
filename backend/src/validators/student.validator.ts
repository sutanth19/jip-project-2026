import { z } from "zod";

export const createStudentSchema = z.object({
  schoolId: z
    .string()
    .uuid("Invalid school ID."),

  classId: z
    .string()
    .uuid("Invalid class ID."),

  studentId: z
    .string()
    .min(1, "Student ID is required."),

  fullName: z
    .string()
    .min(3, "Full name is required."),

  gender: z.enum(["MALE", "FEMALE"]),

  birthDate: z
    .string()
    .datetime()
    .optional(),
});

export const updateStudentSchema = z.object({
  fullName: z
    .string()
    .min(3, "Full name is required.")
    .optional(),

  gender: z
    .enum(["MALE", "FEMALE"])
    .optional(),

  birthDate: z
    .string()
    .datetime()
    .optional(),

  classId: z
    .string()
    .uuid("Invalid class ID.")
    .optional(),
});

export const updateStatusSchema = z.object({
  accountStatus: z.enum([
    "ACTIVE",
    "PENDING",
    "LOCKED",
    "SUSPENDED",
    "ARCHIVED",
  ]),
});