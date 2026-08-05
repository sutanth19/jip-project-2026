import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { ItemReviewStatus, ReviewDecision } from "@prisma/client";
import { completeReviewSchema, itemReviewSchema, listSubmissionsQuerySchema } from "../src/validators/submission.validator.js";

test("submission list defaults to safe pagination and sort fields", () => {
  const value = listSubmissionsQuerySchema.parse({});
  assert.equal(value.page, 1);
  assert.equal(value.limit, 20);
  assert.equal(value.sortBy, "submittedAt");
  assert.equal(value.sortOrder, "desc");
});

test("submission review only accepts manual review decisions", () => {
  assert.equal(itemReviewSchema.parse({ status: ItemReviewStatus.REVIEWED, feedback: "Jelas dan lengkap." }).status, ItemReviewStatus.REVIEWED);
  assert.throws(() => itemReviewSchema.parse({ status: ItemReviewStatus.NOT_REQUIRED }));
});

test("revision-required completion requires overall feedback", () => {
  assert.throws(() => completeReviewSchema.parse({ decision: ReviewDecision.REVISION_REQUIRED }));
  assert.equal(completeReviewSchema.parse({ decision: ReviewDecision.REVISION_REQUIRED, overallFeedback: "Sila baiki tulisan." }).decision, ReviewDecision.REVISION_REQUIRED);
});

test("submission review migration is additive and has immutable attempt linkage", async () => {
  const sql = await readFile(new URL("../prisma/migrations/20260728120000_submission_teacher_review/migration.sql", import.meta.url), "utf8");
  assert.match(sql, /CREATE TABLE "submissions"/);
  assert.match(sql, /CREATE TABLE "teacher_reviews"/);
  assert.match(sql, /CREATE TABLE "submission_item_reviews"/);
  assert.match(sql, /CREATE UNIQUE INDEX "submissions_attemptId_key"/);
  assert.match(sql, /ON DELETE RESTRICT/);
  assert.doesNotMatch(sql, /\bDROP\b/i);
  assert.doesNotMatch(sql, /score|mastery|pbd|certificate/i);
});
