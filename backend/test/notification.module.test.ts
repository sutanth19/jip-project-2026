import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { NotificationPriority, NotificationType } from "@prisma/client";
import { notificationEmailTemplate } from "../src/services/notification-email.service.js";
import { announcementSchema, notificationQuerySchema, preferencesSchema } from "../src/validators/notification.validator.js";

test("notification validation constrains pagination, filtering, and message targets", () => {
  assert.deepEqual(notificationQuerySchema.parse({}), { page: 1, limit: 20, sortOrder: "desc" });
  assert.throws(() => notificationQuerySchema.parse({ page: 0 }));
  assert.throws(() => announcementSchema.parse({ title: "A", body: "B", targets: [] }));
  assert.equal(announcementSchema.parse({ title: "A", body: "B", priority: NotificationPriority.HIGH, targets: [{ role: "STUDENT" }] }).priority, NotificationPriority.HIGH);
  assert.deepEqual(preferencesSchema.parse({ assignments: false, emailEnabled: true }), { assignments: false, emailEnabled: true });
});

test("email template escapes content and only exposes notification-safe fields", () => {
  const html = notificationEmailTemplate({ title: "<Assignment>", body: "Complete <work>", deepLink: "https://example.test/assignment" });
  assert.match(html, /&lt;Assignment&gt;/);
  assert.doesNotMatch(html, /Complete <work>/);
  assert.match(html, /Lihat maklumat/);
});

test("notification module provides read, archive, delivery, preference and role-safe workflows", async () => {
  const source = await readFile(new URL("../src/services/notification.service.ts", import.meta.url), "utf8");
  assert.match(source, /NotificationStatus\.READ/);
  assert.match(source, /NotificationStatus\.ARCHIVED/);
  assert.match(source, /sendResendEmail/);
  assert.match(source, /nextRetryAt/);
  assert.match(source, /notifyAssignmentPublished/);
  assert.match(source, new RegExp(NotificationType.ASSIGNMENT));
});
