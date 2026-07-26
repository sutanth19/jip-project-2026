import assert from "node:assert/strict";
import test from "node:test";
import { UserRole } from "@prisma/client";

import { AppError } from "../src/errors/app-error.js";
import { dispatchAuditEvent } from "../src/services/audit.service.js";
import { canSchoolClassTransitionStatus, createSchoolClass, getSchoolClasses, removeStudentFromSchoolClass } from "../src/services/schoolClass.service.js";
import { createSchoolClassSchema, listClassStudentsQuerySchema, listSchoolClassesQuerySchema, updateSchoolClassSchema } from "../src/validators/schoolClass.validator.js";

const schoolId = "11111111-1111-4111-8111-111111111111";
const teacherId = "22222222-2222-4222-8222-222222222222";
const classId = "33333333-3333-4333-8333-333333333333";
const studentId = "44444444-4444-4444-8444-444444444444";

test("class validators enforce the V1 shape, bounds, safe sorting, and pagination", () => {
  const created = createSchoolClassSchema.parse({ schoolId, teacherId, className: "  1 Amanah ", yearLevel: 1, academicYear: 2026, capacity: 30 });
  assert.equal(created.className, "1 Amanah");
  assert.deepEqual(listSchoolClassesQuerySchema.parse({}), { page: 1, limit: 10, sortBy: "createdAt", sortOrder: "desc" });
  assert.deepEqual(listClassStudentsQuerySchema.parse({}), { page: 1, limit: 10, sortBy: "createdAt", sortOrder: "desc" });
  assert.throws(() => createSchoolClassSchema.parse({ ...created, accountStatus: "ARCHIVED" }));
  assert.throws(() => createSchoolClassSchema.parse({ ...created, yearLevel: 4 }));
  assert.throws(() => updateSchoolClassSchema.parse({ teacherId }));
  assert.throws(() => updateSchoolClassSchema.parse({}));
});

test("class status policy supports operational changes and reserves archived restoration", () => {
  assert.equal(canSchoolClassTransitionStatus("ACTIVE", "SUSPENDED", UserRole.ADMIN), true);
  assert.equal(canSchoolClassTransitionStatus("SUSPENDED", "ACTIVE", UserRole.ADMIN), true);
  assert.equal(canSchoolClassTransitionStatus("ACTIVE", "ARCHIVED", UserRole.ADMIN), true);
  assert.equal(canSchoolClassTransitionStatus("ARCHIVED", "ACTIVE", UserRole.ADMIN), false);
  assert.equal(canSchoolClassTransitionStatus("ARCHIVED", "ACTIVE", UserRole.SUPER_ADMIN), true);
  assert.equal(canSchoolClassTransitionStatus("ACTIVE", "ACTIVE", UserRole.SUPER_ADMIN), false);
});

test("non-management accounts are denied class reads and writes before database access", async () => {
  const teacherContext = { actor: { userId: "user", profileId: teacherId, role: UserRole.TEACHER, schoolId, isFirstLogin: false } };
  const studentContext = { actor: { userId: "user", profileId: studentId, role: UserRole.STUDENT, schoolId, isFirstLogin: false } };
  const parentContext = { actor: { userId: "user", profileId: "parent", role: UserRole.PARENT, schoolId: null, isFirstLogin: false } };
  const payload = createSchoolClassSchema.parse({ schoolId, teacherId, className: "1 Amanah", yearLevel: 1, academicYear: 2026 });
  await assert.rejects(() => createSchoolClass(payload, teacherContext), (caught: unknown) => caught instanceof AppError && caught.code === "AUTH_ROLE_FORBIDDEN");
  await assert.rejects(() => getSchoolClasses(listSchoolClassesQuerySchema.parse({}), parentContext), (caught: unknown) => caught instanceof AppError && caught.code === "AUTH_ROLE_FORBIDDEN");
  await assert.rejects(() => removeStudentFromSchoolClass(classId, studentId, studentContext), (caught: unknown) => caught instanceof AppError && caught.code === "AUTH_ROLE_FORBIDDEN");
});

test("class removal is explicitly unsupported and cannot orphan a student", async () => {
  const context = { actor: { userId: "user", profileId: "admin", role: UserRole.ADMIN, schoolId: null, isFirstLogin: false } };
  await assert.rejects(() => removeStudentFromSchoolClass(classId, studentId, context), (caught: unknown) => caught instanceof AppError && caught.code === "CLASS_STUDENT_REMOVAL_NOT_SUPPORTED" && caught.statusCode === 400);
});

test("class audit actions retain actor, class, school, and safe assignment data", async () => {
  let received: unknown;
  await dispatchAuditEvent({
    actorUserId: "actor-user", actorProfileId: "admin", actorRole: UserRole.ADMIN, actorName: null,
    action: "CLASS_TEACHER_CHANGED", resourceType: "CLASS", resourceId: classId, schoolId,
    before: { teacherId: "old-teacher" }, after: { teacherId }, timestamp: new Date("2026-07-26T00:00:00.000Z"), requestIp: "127.0.0.1", userAgent: "test",
  }, (event) => { received = event; });
  assert.deepEqual(received && JSON.parse(JSON.stringify(received)), {
    actorUserId: "actor-user", actorProfileId: "admin", actorRole: "ADMIN", actorName: null,
    action: "CLASS_TEACHER_CHANGED", resourceType: "CLASS", resourceId: classId, schoolId,
    before: { teacherId: "old-teacher" }, after: { teacherId }, timestamp: "2026-07-26T00:00:00.000Z", requestIp: "127.0.0.1", userAgent: "test",
  });
});
