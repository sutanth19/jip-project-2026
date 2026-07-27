import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  ACTIVITY_MEDIA_ROLES,
  addDigitalActivityMediaSchema,
  createDigitalActivityCurriculumLinkSchema,
  createDigitalActivitySchema,
  listDigitalActivitiesQuerySchema,
  reorderDigitalActivityItemsSchema,
  updateDigitalActivitySchema,
} from "../src/validators/digitalActivity.validator.js";

const programmeId = "11111111-1111-4111-8111-111111111111";
const templateId = "22222222-2222-4222-8222-222222222222";
const itemId = "33333333-3333-4333-8333-333333333333";

test("Digital Activity validators accept an explicit draft shape and safe default listing", () => {
  const activity = createDigitalActivitySchema.parse({
    code: " act-word-01 ",
    title: "  Baca perkataan  ",
    instructions: "Pilih jawapan yang betul.",
    programmeId,
    activityTemplateId: templateId,
    difficulty: "BASIC",
    scoringMode: "NONE",
    reviewMode: "TEACHER",
    configuration: { recordingRequired: false },
  });

  assert.equal(activity.code, "ACT-WORD-01");
  assert.equal(activity.title, "Baca perkataan");
  assert.equal(activity.allowRetry, true);
  assert.deepEqual(listDigitalActivitiesQuerySchema.parse({}), {
    page: 1,
    limit: 20,
    sortBy: "createdAt",
    sortOrder: "desc",
  });
});

test("Digital Activity validators reject mass assignment, empty edits, invalid links, and duplicate reorders", () => {
  assert.throws(() => createDigitalActivitySchema.parse({
    title: "Aktiviti", instructions: "Arahan", programmeId, activityTemplateId: templateId,
    difficulty: "BASIC", scoringMode: "NONE", reviewMode: "AUTO", configuration: {}, status: "PUBLISHED",
  }));
  assert.throws(() => updateDigitalActivitySchema.parse({}));
  assert.throws(() => createDigitalActivityCurriculumLinkSchema.parse({}));
  assert.throws(() => reorderDigitalActivityItemsSchema.parse({ activityItemIds: [itemId, itemId] }));
  assert.throws(() => addDigitalActivityMediaSchema.parse({ mediaKey: "../private.png", mediaRole: "COVER_IMAGE" }));
  assert.equal(ACTIVITY_MEDIA_ROLES.includes("REWARD_SOUND"), true);
});

test("Digital Activity migration creates only additive activity-builder structures", async () => {
  const sql = await readFile(new URL("../prisma/migrations/20260726200015_digital_activity_builder/migration.sql", import.meta.url), "utf8");
  assert.match(sql, /CREATE TABLE "digital_activities"/);
  assert.match(sql, /CREATE TABLE "digital_activity_review_history"/);
  assert.match(sql, /CREATE TYPE "DigitalActivityStatus"/);
  assert.doesNotMatch(sql, /\bDROP\b/i);
});
