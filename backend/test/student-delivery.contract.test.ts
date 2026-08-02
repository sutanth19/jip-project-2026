import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

test("student delivery uses the dedicated safe activity mapper instead of an empty item placeholder", async () => {
  const assignmentService = await readFile(new URL("../src/services/assignment.service.ts", import.meta.url), "utf8");
  const activityService = await readFile(new URL("../src/services/digitalActivity.service.ts", import.meta.url), "utf8");

  assert.match(assignmentService, /studentDeliveryActivity\(record\.digitalActivity\.id\)/);
  assert.doesNotMatch(assignmentService, /deliveryStatus: "AVAILABLE"[\s\S]{0,500}items: \[\]/);
  assert.match(activityService, /export async function studentDeliveryActivity/);
  assert.match(activityService, /items: preview\.items\.map/);
  assert.match(activityService, /sequence: item\.sequence/);
});

test("student delivery projection excludes workflow and private preview fields", async () => {
  const activityService = await readFile(new URL("../src/services/digitalActivity.service.ts", import.meta.url), "utf8");
  const start = activityService.indexOf("export async function studentDeliveryActivity");
  const end = activityService.indexOf("export async function listDigitalActivityReviewHistory", start);
  const projection = activityService.slice(start, end);

  assert.ok(start >= 0 && end > start);
  assert.doesNotMatch(projection, /reviewHistory|createdByUserId|configurationSchema|teacherReviewRequired|audit/i);
  assert.match(projection, /correctAnswer: item\.questionBankItem\.correctAnswer/);
});
