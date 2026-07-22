import { z } from "zod";

export const createParentStudentSchema = z.object({
  parentId: z
    .string()
    .uuid("Invalid parent ID."),

  studentId: z
    .string()
    .uuid("Invalid student ID."),

  relationship: z.enum([
    "FATHER",
    "MOTHER",
    "GUARDIAN",
  ]),
});

export const updateParentStudentSchema = z.object({
  relationship: z.enum([
    "FATHER",
    "MOTHER",
    "GUARDIAN",
  ]),
});