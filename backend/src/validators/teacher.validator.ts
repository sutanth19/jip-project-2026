import { z } from "zod";

export const createTeacherSchema = z.object({
  schoolId: z
  .string()
  .uuid("Invalid school ID."),

  teacherId: z
    .string()
    .min(1, "Teacher ID is required."),

  fullName: z
    .string()
    .min(3, "Full name is required."),

  email: z.email("Invalid email address."),

  phone: z
    .string()
    .min(10, "Phone number is invalid."),

  gender: z.enum([
    "MALE",
    "FEMALE",
  ]),
});