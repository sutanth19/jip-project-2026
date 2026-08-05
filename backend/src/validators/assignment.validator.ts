import { AssignmentPriority, AssignmentStatus } from "@prisma/client";
import { z } from "zod";

const uuid = (message: string) => z.string().trim().uuid(message);
const page = z.coerce.number().int().min(1).default(1);
const limit = z.coerce.number().int().min(1).max(100).default(20);
const text = (min: number, max: number, label: string) => z.string().trim().min(min, `${label} diperlukan.`).max(max, `${label} terlalu panjang.`);
const optText = (max: number, label: string) => text(1, max, label).nullable().optional();
const date = z.string().datetime({ offset: true }).transform((value) => new Date(value));
const optionalDate = date.nullable().optional();
const ids = (max: number, message: string) => z.array(uuid(message)).max(max).default([]);
const sortOrder = z.enum(["asc", "desc"]).default("desc");
const boolean = z.boolean();

export const assignmentIdParamsSchema = z.object({ assignmentId: uuid("ID tugasan tidak sah.") }).strict();
export const assignmentTargetParamsSchema = z.object({ assignmentId: uuid("ID tugasan tidak sah."), classId: uuid("ID kelas tidak sah."), studentId: uuid("ID murid tidak sah.") }).strict();
export const childAssignmentParamsSchema = z.object({ studentId: uuid("ID murid tidak sah.") }).strict();

export const createAssignmentSchema = z.object({
  title: text(1, 200, "Tajuk"),
  instructions: optText(2000, "Arahan"),
  digitalActivityId: uuid("ID aktiviti digital tidak sah."),
  schoolId: uuid("ID sekolah tidak sah.").optional(),
  classIds: ids(50, "ID kelas tidak sah."),
  studentIds: ids(500, "ID murid tidak sah."),
  priority: z.nativeEnum(AssignmentPriority).default(AssignmentPriority.NORMAL),
  startAt: optionalDate,
  dueAt: optionalDate,
  availableUntil: optionalDate,
  isRequired: boolean.default(true),
  attemptsAllowed: z.number().int().min(1).max(20).nullable().optional(),
  showResultsAfterCompletion: boolean.default(false),
}).strict().refine((value) => value.classIds.length + value.studentIds.length > 0, { message: "Sekurang-kurangnya satu sasaran diperlukan." });

export const updateAssignmentSchema = z.object({
  title: text(1, 200, "Tajuk").optional(),
  instructions: optText(2000, "Arahan"),
  digitalActivityId: uuid("ID aktiviti digital tidak sah.").optional(),
  priority: z.nativeEnum(AssignmentPriority).optional(),
  startAt: optionalDate,
  dueAt: optionalDate,
  availableUntil: optionalDate,
  isRequired: boolean.optional(),
  attemptsAllowed: z.number().int().min(1).max(20).nullable().optional(),
  showResultsAfterCompletion: boolean.optional(),
}).strict().refine((value) => Object.keys(value).length > 0, { message: "Sekurang-kurangnya satu medan kemas kini diperlukan." });

export const listAssignmentsQuerySchema = z.object({
  page,
  limit,
  search: z.string().trim().min(1).max(200).optional(),
  status: z.nativeEnum(AssignmentStatus).optional(),
  schoolId: uuid("ID sekolah tidak sah.").optional(),
  teacherId: uuid("ID guru tidak sah.").optional(),
  digitalActivityId: uuid("ID aktiviti digital tidak sah.").optional(),
  classId: uuid("ID kelas tidak sah.").optional(),
  studentId: uuid("ID murid tidak sah.").optional(),
  priority: z.nativeEnum(AssignmentPriority).optional(),
  startFrom: optionalDate,
  startTo: optionalDate,
  dueFrom: optionalDate,
  dueTo: optionalDate,
  sortBy: z.enum(["createdAt", "startAt"]).default("createdAt"),
  sortOrder,
}).strict();

export const studentAssignmentsQuerySchema = z.object({
  page,
  limit,
  search: z.string().trim().min(1).max(200).optional(),
  status: z.enum(["UPCOMING", "AVAILABLE", "OVERDUE", "CLOSED"]).optional(),
  priority: z.nativeEnum(AssignmentPriority).optional(),
  isRequired: boolean.optional(),
  dueFrom: optionalDate,
  dueTo: optionalDate,
  sortOrder,
}).strict();

export const parentAssignmentsQuerySchema = z.object({
  page,
  limit,
  search: z.string().trim().min(1).max(200).optional(),
  status: z.enum(["UPCOMING", "AVAILABLE", "OVERDUE", "CLOSED"]).optional(),
  priority: z.nativeEnum(AssignmentPriority).optional(),
  sortOrder,
}).strict();

export type CreateAssignmentRequest = z.infer<typeof createAssignmentSchema>;
export type UpdateAssignmentRequest = z.infer<typeof updateAssignmentSchema>;
export type ListAssignmentsQuery = z.infer<typeof listAssignmentsQuerySchema>;
export type StudentAssignmentsQuery = z.infer<typeof studentAssignmentsQuerySchema>;
export type ParentAssignmentsQuery = z.infer<typeof parentAssignmentsQuerySchema>;
