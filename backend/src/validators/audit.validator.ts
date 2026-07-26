import { UserRole } from "@prisma/client";
import { z } from "zod";

import { AUDIT_ACTIONS, AUDIT_RESOURCE_TYPES } from "../services/audit.service.js";

function auditDateSchema(endOfDay: boolean) {
  return z.string().trim().min(1, "Tarikh audit tidak sah.").max(64, "Tarikh audit tidak sah.").transform((value, context) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      context.addIssue({ code: "custom", message: "Tarikh audit tidak sah." });
      return z.NEVER;
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) date.setUTCHours(endOfDay ? 23 : 0, endOfDay ? 59 : 0, endOfDay ? 59 : 0, endOfDay ? 999 : 0);
    return date;
  });
}

export const listAuditLogsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().min(1).max(150).optional(),
  action: z.enum(AUDIT_ACTIONS).optional(),
  resourceType: z.enum(AUDIT_RESOURCE_TYPES).optional(),
  resourceId: z.string().trim().min(1).max(512).optional(),
  actorUserId: z.string().uuid("ID pengguna pelaku tidak sah.").optional(),
  actorRole: z.nativeEnum(UserRole).optional(),
  schoolId: z.string().uuid("ID sekolah tidak sah.").optional(),
  dateFrom: auditDateSchema(false).optional(),
  dateTo: auditDateSchema(true).optional(),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
}).strict().superRefine((value, context) => {
  if (value.dateFrom && value.dateTo && value.dateFrom > value.dateTo) {
    context.addIssue({ code: "custom", message: "Tarikh mula tidak boleh melebihi tarikh akhir.", path: ["dateFrom"] });
  }
});

export const auditLogIdParamsSchema = z.object({
  auditLogId: z.string().uuid("ID rekod audit tidak sah."),
}).strict();

export type ListAuditLogsRequest = z.infer<typeof listAuditLogsQuerySchema>;
