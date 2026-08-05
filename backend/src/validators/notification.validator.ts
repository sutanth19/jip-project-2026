import { NotificationChannel, NotificationPriority, NotificationType, UserRole } from "@prisma/client";
import { z } from "zod";

const uuid = (message: string) => z.string().trim().uuid(message);
const url = z.string().trim().url().max(2048);
const nullableUrl = url.nullish();
const date = z.coerce.date();

export const notificationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1), limit: z.coerce.number().int().min(1).max(100).default(20),
  type: z.nativeEnum(NotificationType).optional(), priority: z.nativeEnum(NotificationPriority).optional(),
  status: z.enum(["unread", "read", "archived"]).optional(), search: z.string().trim().min(1).max(160).optional(),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
}).strict();
export const notificationIdParamsSchema = z.object({ id: uuid("ID notifikasi tidak sah.") }).strict();
export const notificationIdsSchema = z.object({ notificationIds: z.array(uuid("ID notifikasi tidak sah.")).min(1).max(100) }).strict();
export const emptySchema = z.object({}).strict();
export const preferencesSchema = z.object({
  assignments: z.boolean().optional(), assessments: z.boolean().optional(), announcements: z.boolean().optional(), ai: z.boolean().optional(), parentProgress: z.boolean().optional(), reminders: z.boolean().optional(), security: z.boolean().optional(), emailEnabled: z.boolean().optional(), inAppEnabled: z.boolean().optional(),
}).strict();
const targetSchema = z.object({ schoolId: uuid("ID sekolah tidak sah.").optional(), classId: uuid("ID kelas tidak sah.").optional(), role: z.nativeEnum(UserRole).optional() }).strict().refine((target) => target.schoolId || target.classId || target.role, "Sasaran pengumuman diperlukan.");
export const announcementSchema = z.object({
  title: z.string().trim().min(1).max(180), body: z.string().trim().min(1).max(5000), imageUrl: nullableUrl, attachmentUrl: nullableUrl,
  priority: z.nativeEnum(NotificationPriority).default(NotificationPriority.NORMAL), pinned: z.boolean().default(false), schoolId: uuid("ID sekolah tidak sah.").optional(),
  publishAt: date.optional(), expiresAt: date.optional(), targets: z.array(targetSchema).min(1).max(100),
}).strict().superRefine((value, ctx) => { if (value.publishAt && value.expiresAt && value.publishAt >= value.expiresAt) ctx.addIssue({ code: "custom", path: ["expiresAt"], message: "Tarikh tamat mesti selepas tarikh terbit." }); });
export type NotificationQuery = z.infer<typeof notificationQuerySchema>;
export type NotificationIds = z.infer<typeof notificationIdsSchema>;
export type PreferencesInput = z.infer<typeof preferencesSchema>;
export type AnnouncementInput = z.infer<typeof announcementSchema>;
export const channelSchema = z.nativeEnum(NotificationChannel);
