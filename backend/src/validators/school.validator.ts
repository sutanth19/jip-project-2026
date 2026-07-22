import { z } from "zod";

export const createSchoolSchema = z.object({
  schoolCode: z
    .string()
    .min(1, "School code is required."),

  schoolName: z
    .string()
    .min(3, "School name is required."),

  principalName: z
    .string()
    .min(3, "Principal name is required."),

  address: z
    .string()
    .min(5, "Address is required."),

  phone: z
    .string()
    .min(10, "Phone number is invalid."),

  contactEmail: z
    .string()
    .email("Invalid contact email."),

  adminName: z
    .string()
    .min(3, "Admin name is required."),

  adminEmail: z
    .string()
    .email("Invalid admin email."),

  adminPhone: z
    .string()
    .min(10, "Admin phone number is invalid."),
});