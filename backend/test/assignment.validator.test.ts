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
