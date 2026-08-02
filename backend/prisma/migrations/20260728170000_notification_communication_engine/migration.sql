-- Phase 26: durable, recipient-scoped notifications and announcements.
CREATE TYPE "NotificationType" AS ENUM ('SYSTEM', 'ANNOUNCEMENT', 'ASSIGNMENT', 'SUBMISSION', 'ASSESSMENT', 'PBD_PROGRESS', 'PARENT_PROGRESS', 'TEACHER_REVIEW', 'REVISION_REQUIRED', 'AI_COMPLETED', 'REMINDER', 'SECURITY', 'PROFILE', 'ACCOUNT');
CREATE TYPE "NotificationChannel" AS ENUM ('IN_APP', 'EMAIL', 'BOTH');
CREATE TYPE "NotificationStatus" AS ENUM ('PENDING', 'QUEUED', 'SENT', 'FAILED', 'READ', 'ARCHIVED');
CREATE TYPE "NotificationPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');

CREATE TABLE "notifications" (
  "id" UUID NOT NULL, "type" "NotificationType" NOT NULL, "channel" "NotificationChannel" NOT NULL DEFAULT 'IN_APP', "status" "NotificationStatus" NOT NULL DEFAULT 'PENDING', "priority" "NotificationPriority" NOT NULL DEFAULT 'NORMAL', "title" TEXT NOT NULL, "body" TEXT NOT NULL, "imageUrl" TEXT, "attachmentUrl" TEXT, "deepLink" TEXT, "schoolId" UUID, "createdByUserId" UUID, "scheduledFor" TIMESTAMP(3), "expiresAt" TIMESTAMP(3), "sourceType" TEXT, "sourceId" TEXT, "metadata" JSONB, "deletedAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "notification_recipients" (
  "id" UUID NOT NULL, "notificationId" UUID NOT NULL, "userId" UUID NOT NULL, "status" "NotificationStatus" NOT NULL DEFAULT 'QUEUED', "readAt" TIMESTAMP(3), "archivedAt" TIMESTAMP(3), "deletedAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "notification_recipients_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "notification_deliveries" (
  "id" UUID NOT NULL, "notificationId" UUID NOT NULL, "recipientId" UUID NOT NULL, "channel" "NotificationChannel" NOT NULL, "status" "NotificationStatus" NOT NULL DEFAULT 'PENDING', "provider" TEXT, "providerId" TEXT, "attemptedAt" TIMESTAMP(3), "deliveredAt" TIMESTAMP(3), "failedAt" TIMESTAMP(3), "retryCount" INTEGER NOT NULL DEFAULT 0, "nextRetryAt" TIMESTAMP(3), "failureReason" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "notification_deliveries_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "notification_preferences" (
  "id" UUID NOT NULL, "userId" UUID NOT NULL, "assignments" BOOLEAN NOT NULL DEFAULT true, "assessments" BOOLEAN NOT NULL DEFAULT true, "announcements" BOOLEAN NOT NULL DEFAULT true, "ai" BOOLEAN NOT NULL DEFAULT true, "parentProgress" BOOLEAN NOT NULL DEFAULT true, "reminders" BOOLEAN NOT NULL DEFAULT true, "security" BOOLEAN NOT NULL DEFAULT true, "emailEnabled" BOOLEAN NOT NULL DEFAULT true, "inAppEnabled" BOOLEAN NOT NULL DEFAULT true, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "notification_preferences_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "announcements" (
  "id" UUID NOT NULL, "title" TEXT NOT NULL, "body" TEXT NOT NULL, "imageUrl" TEXT, "attachmentUrl" TEXT, "priority" "NotificationPriority" NOT NULL DEFAULT 'NORMAL', "pinned" BOOLEAN NOT NULL DEFAULT false, "schoolId" UUID, "createdByUserId" UUID NOT NULL, "publishAt" TIMESTAMP(3), "publishedAt" TIMESTAMP(3), "expiresAt" TIMESTAMP(3), "archivedAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "announcements_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "announcement_targets" (
  "id" UUID NOT NULL, "announcementId" UUID NOT NULL, "schoolId" UUID, "classId" UUID, "role" "UserRole", "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "announcement_targets_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "notification_recipients_notificationId_userId_key" ON "notification_recipients"("notificationId", "userId");
CREATE UNIQUE INDEX "notification_preferences_userId_key" ON "notification_preferences"("userId");
CREATE INDEX "notifications_schoolId_createdAt_idx" ON "notifications"("schoolId", "createdAt");
CREATE INDEX "notifications_status_scheduledFor_idx" ON "notifications"("status", "scheduledFor");
CREATE INDEX "notifications_type_createdAt_idx" ON "notifications"("type", "createdAt");
CREATE INDEX "notifications_expiresAt_idx" ON "notifications"("expiresAt");
CREATE INDEX "notification_recipients_userId_status_createdAt_idx" ON "notification_recipients"("userId", "status", "createdAt");
CREATE INDEX "notification_deliveries_status_nextRetryAt_idx" ON "notification_deliveries"("status", "nextRetryAt");
CREATE INDEX "notification_deliveries_recipientId_idx" ON "notification_deliveries"("recipientId");
CREATE INDEX "announcements_schoolId_publishedAt_idx" ON "announcements"("schoolId", "publishedAt");
CREATE INDEX "announcements_publishAt_idx" ON "announcements"("publishAt");
CREATE INDEX "announcement_targets_announcementId_idx" ON "announcement_targets"("announcementId");
CREATE INDEX "announcement_targets_schoolId_role_idx" ON "announcement_targets"("schoolId", "role");
CREATE INDEX "announcement_targets_classId_idx" ON "announcement_targets"("classId");
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "notification_recipients" ADD CONSTRAINT "notification_recipients_notificationId_fkey" FOREIGN KEY ("notificationId") REFERENCES "notifications"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "notification_recipients" ADD CONSTRAINT "notification_recipients_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "notification_deliveries" ADD CONSTRAINT "notification_deliveries_notificationId_fkey" FOREIGN KEY ("notificationId") REFERENCES "notifications"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "notification_deliveries" ADD CONSTRAINT "notification_deliveries_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "notification_recipients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "announcements" ADD CONSTRAINT "announcements_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "announcements" ADD CONSTRAINT "announcements_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "announcement_targets" ADD CONSTRAINT "announcement_targets_announcementId_fkey" FOREIGN KEY ("announcementId") REFERENCES "announcements"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "announcement_targets" ADD CONSTRAINT "announcement_targets_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "announcement_targets" ADD CONSTRAINT "announcement_targets_classId_fkey" FOREIGN KEY ("classId") REFERENCES "school_classes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
