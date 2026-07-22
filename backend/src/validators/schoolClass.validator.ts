import { z } from "zod";

export const createSchoolClassSchema = z.object({
  schoolId: z
    .string()
    .uuid("Invalid school ID."),

  teacherId: z
    .string()
    .uuid("Invalid teacher ID."),

  className: z
    .string()
    .min(1, "Class name is required."),

  yearLevel: z
    .number()
    .int()
    .min(1)
    .max(6),

  academicYear: z
    .number()
    .int(),

  capacity: z
    .number()
    .int()
    .positive()
    .optional(),
});

export const updateSchoolClassSchema = z.object({
  teacherId: z
    .string()
    .uuid("Invalid teacher ID.")
    .optional(),

  className: z
    .string()
    .min(2, "Class name is required.")
    .optional(),

  yearLevel: z
    .number()
    .int()
    .min(1)
    .max(6)
    .optional(),

  academicYear: z
    .number()
    .int()
    .min(2025)
    .optional(),

  capacity: z
    .number()
    .int()
    .min(1)
    .max(100)
    .optional(),
});

export const updateSchoolClassStatusSchema = z.object({
  accountStatus: z.enum([
    "ACTIVE",
    "PENDING",
    "LOCKED",
    "SUSPENDED",
    "ARCHIVED",
  ]),
});