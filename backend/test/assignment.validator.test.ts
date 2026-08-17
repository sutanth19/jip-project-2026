import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { createAssignmentSchema, listAssignmentsQuerySchema, studentAssignmentsQuerySchema } from "../src/validators/assignment.validator.js";

const digitalActivityId = "11111111-1111-4111-8111-111111111111";
const classId = "22222222-2222-4222-8222-222222222222";
const studentId = "33333333-3333-4333-8333-333333333333";

test("Assignment validators accept a valid target payload and default query shape", () => {
  const body = createAssignmentSchema.parse({ title: "Latihan", digitalActivityId, classIds: [classId], studentIds: [studentId] });
  assert.equal(body.priority, "NORMAL");
  assert.deepEqual(listAssignmentsQuerySchema.parse({}), { page: 1, limit: 20, sortBy: "createdAt", sortOrder: "desc" });
  assert.deepEqual(studentAssignmentsQuerySchema.parse({}), { page: 1, limit: 20, sortOrder: "desc" });
});

test("Assignment migration is additive", async () => {
  const sql = await readFile(new URL("../prisma/migrations/20260727190000_student_assignment_delivery/migration.sql", import.meta.url), "utf8");
  assert.match(sql, /CREATE TABLE "assignments"/);
  assert.match(sql, /CREATE TABLE "assignment_class_targets"/);
  assert.match(sql, /CREATE TABLE "assignment_student_targets"/);
  assert.doesNotMatch(sql, /\bDROP\b/i);
});

test("Assignment service keeps teacher assignment creation scoped to active published activity targets", async () => {
  const source = await readFile(new URL("../src/services/assignment.service.ts", import.meta.url), "utf8");

  assert.match(source, /if \(!activity \|\| activity\.status !== "PUBLISHED"\)/);
  assert.match(source, /if \(!school \|\| school\.accountStatus !== AccountStatus\.ACTIVE\)/);
  assert.match(source, /if \(!teacher \|\| teacher\.user\.accountStatus !== AccountStatus\.ACTIVE\)/);
  assert.match(source, /if \(context\.actor\.role === UserRole\.TEACHER\)/);
  assert.match(source, /if \(!teacher\.schoolId \|\| !context\.actor\.schoolId\) throw schoolContextRequired\(\)/);
  assert.match(source, /if \(school\.id !== teacher\.schoolId\) throw denied\(\)/);
  assert.match(source, /for \(const schoolClass of classes\)/);
  assert.match(source, /for \(const student of students\)/);
  assert.match(source, /schoolClass\.teacherId !== teacher\.id\) throw denied\(\)/);
  assert.match(source, /student\.class\.teacherId !== teacher\.id\) throw denied\(\)/);
  assert.match(source, /if \(student\.user\.accountStatus !== AccountStatus\.ACTIVE\) throw invalidTarget\("Hanya murid aktif boleh ditugaskan\."\)/);
  assert.match(source, /if \(student\.class\.accountStatus !== AccountStatus\.ACTIVE\) throw invalidTarget\("Murid dalam kelas tidak aktif tidak boleh ditugaskan\."\)/);
});

test("Assignment service derives real status, persists targets, and scopes teacher reads", async () => {
  const source = await readFile(new URL("../src/services/assignment.service.ts", import.meta.url), "utf8");

  assert.match(source, /const status = input\.startAt && input\.startAt > now \? AssignmentStatus\.SCHEDULED : AssignmentStatus\.ACTIVE;/);
  assert.match(source, /publishedAt: now,/);
  assert.match(source, /if \(classIds\.length\) await tx\.assignmentClassTarget\.createMany/);
  assert.match(source, /if \(studentIds\.length\) await tx\.assignmentStudentTarget\.createMany/);
  assert.match(source, /where\.schoolId = context\.actor\.schoolId \?\? undefined;/);
  assert.match(source, /where\.assignedByTeacherId = context\.actor\.profileId;/);
  assert.match(source, /function ensureTeacherOwnsAssignment/);
  assert.match(source, /record\.assignedByTeacher\.id !== context\.actor\.profileId \|\| record\.school\.id !== context\.actor\.schoolId/);
  assert.match(source, /record\.status !== AssignmentStatus\.DRAFT && record\.status !== AssignmentStatus\.SCHEDULED && record\.status !== AssignmentStatus\.ACTIVE/);
});

test("Assignment service rejects duplicate targets and invalid schedules", async () => {
  const source = await readFile(new URL("../src/services/assignment.service.ts", import.meta.url), "utf8");

  assert.match(source, /if \(classIds\.length !== input\.classIds\.length \|\| studentIds\.length !== input\.studentIds\.length\) throw duplicateTarget\(\)/);
  assert.match(source, /if \(input\.startAt && input\.dueAt && input\.dueAt < input\.startAt\) throw invalidSchedule\("Tarikh tamat mesti selepas tarikh mula\."\)/);
  assert.match(source, /if \(input\.dueAt && input\.availableUntil && input\.availableUntil < input\.dueAt\) throw invalidSchedule\("Tarikh tutup mesti sama atau selepas tarikh tamat\."\)/);
  assert.match(source, /if \(input\.startAt && input\.availableUntil && input\.availableUntil < input\.startAt\) throw invalidSchedule\("Tarikh tutup mesti selepas tarikh mula\."\)/);
});
