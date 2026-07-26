import assert from "node:assert/strict";
import test from "node:test";
import { UserRole } from "@prisma/client";

import { AppError } from "../src/errors/app-error.js";
import { dispatchAuditEvent } from "../src/services/audit.service.js";
import { canStudentTransitionStatus, createStudent, generateTemporaryStudentPin, listStudents } from "../src/services/student.service.js";
import { createStudentSchema, listStudentsQuerySchema, updateStudentSchema } from "../src/validators/student.validator.js";

const schoolId = "11111111-1111-4111-8111-111111111111";
const classId = "22222222-2222-4222-8222-222222222222";

test("student validators normalize IDs, enforce safe fields, and supply list defaults", () => {
  const student = createStudentSchema.parse({ schoolId, classId, studentId: " a-12_b ", fullName: "  Nur Aisyah  ", gender: "FEMALE", birthDate: "2015-05-20" });
  assert.equal(student.studentId, "A-12_B");
  assert.equal(student.fullName, "Nur Aisyah");
  assert.deepEqual(listStudentsQuerySchema.parse({}), { page: 1, limit: 10, sortBy: "createdAt", sortOrder: "desc" });
  assert.throws(() => createStudentSchema.parse({ ...student, pinHash: "secret" }));
  assert.throws(() => updateStudentSchema.parse({ classId }));
  assert.throws(() => updateStudentSchema.parse({}));
});

test("temporary Student PINs are four digits and never weak patterns", () => {
  for (let index = 0; index < 25; index += 1) {
    const pin = generateTemporaryStudentPin();
    assert.match(pin, /^\d{4}$/);
    assert.equal(/^(\d)\1{3}$/.test(pin), false);
    assert.equal(["0123", "1234", "2345", "3456", "4567", "5678", "6789", "9876", "8765", "7654", "6543", "5432", "4321", "3210"].includes(pin), false);
  }
});

test("student status policy reserves archived restoration for SUPER_ADMIN", () => {
  assert.equal(canStudentTransitionStatus("ACTIVE", "SUSPENDED", UserRole.ADMIN), true);
  assert.equal(canStudentTransitionStatus("SUSPENDED", "ACTIVE", UserRole.ADMIN), true);
  assert.equal(canStudentTransitionStatus("ACTIVE", "ARCHIVED", UserRole.ADMIN), true);
  assert.equal(canStudentTransitionStatus("ARCHIVED", "ACTIVE", UserRole.ADMIN), false);
  assert.equal(canStudentTransitionStatus("ARCHIVED", "ACTIVE", UserRole.SUPER_ADMIN), true);
  assert.equal(canStudentTransitionStatus("ACTIVE", "ACTIVE", UserRole.SUPER_ADMIN), false);
});

test("student and parent accounts are denied Student Management before database access", async () => {
  const parentContext = { actor: { userId: "user", profileId: "profile", role: UserRole.PARENT, schoolId: null, isFirstLogin: false } };
  const studentContext = { actor: { userId: "user", profileId: "profile", role: UserRole.STUDENT, schoolId, isFirstLogin: false } };
  await assert.rejects(() => listStudents(listStudentsQuerySchema.parse({}), parentContext), (caught: unknown) => caught instanceof AppError && caught.code === "AUTH_ROLE_FORBIDDEN");
  await assert.rejects(() => createStudent(createStudentSchema.parse({ schoolId, classId, studentId: "A12", fullName: "Nur Aisyah", gender: "FEMALE" }), studentContext), (caught: unknown) => caught instanceof AppError && caught.code === "AUTH_ROLE_FORBIDDEN");
});

test("student audit actions retain context without credential values", async () => {
  let received: unknown;
  await dispatchAuditEvent({
    actorUserId: "actor-user", actorProfileId: "actor-profile", actorRole: UserRole.ADMIN, actorName: null,
    action: "STUDENT_PIN_RESET", resourceType: "STUDENT", resourceId: "student-profile", schoolId,
    before: null, after: { isPinChanged: false, pinUpdatedAt: new Date("2026-07-26T00:00:00.000Z") },
    timestamp: new Date("2026-07-26T00:00:00.000Z"), requestIp: "127.0.0.1", userAgent: "test",
  }, (event) => { received = event; });
  assert.deepEqual(received && JSON.parse(JSON.stringify(received)), {
    actorUserId: "actor-user", actorProfileId: "actor-profile", actorRole: "ADMIN", actorName: null,
    action: "STUDENT_PIN_RESET", resourceType: "STUDENT", resourceId: "student-profile", schoolId,
    before: null, after: { isPinChanged: false, pinUpdatedAt: "2026-07-26T00:00:00.000Z" },
    timestamp: "2026-07-26T00:00:00.000Z", requestIp: "127.0.0.1", userAgent: "test",
  });
});
