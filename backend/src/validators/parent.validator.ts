import { z } from "zod";

export const createParentSchema = z.object({
  schoolId: z
    .string()
    .uuid("Invalid school ID."),

  fullName: z
    .string()
    .min(3, "Full name is required."),

  email: z
    .string()
    .email("Invalid email address."),

  phone: z
    .string()
    .min(10, "Phone number is invalid."),

  occupation: z
    .string()
    .optional(),

  address: z
    .string()
    .optional(),
});