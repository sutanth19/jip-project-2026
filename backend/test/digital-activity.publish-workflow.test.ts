import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("publish workflow allows direct DRAFT to PUBLISHED activation while retaining review history coverage for IN_REVIEW", async () => {
  const service = await readFile(new URL("../src/services/digitalActivity.service.ts", import.meta.url), "utf8");
  const routes = await readFile(new URL("../src/routes/digitalActivity.routes.ts", import.meta.url), "utf8");

  assert.match(service, /record\.status !== DigitalActivityStatus\.IN_REVIEW && record\.status !== DigitalActivityStatus\.DRAFT/);
  assert.match(service, /publication\s*&&\s*record\.status === DigitalActivityStatus\.IN_REVIEW/);
  assert.match(service, /fromStatus: record\.status, toStatus: DigitalActivityStatus\.PUBLISHED/);
  assert.match(service, /export async function getDigitalActivityPublishReadiness/);
  assert.match(service, /const issues = await collectWorkflowIssues\(record, true\)/);
  assert.match(service, /ready: issues\.length === 0/);
  assert.match(service, /function buildReadinessChecks/);
  assert.match(service, /SCORING_INVALID/);
  assert.match(service, /await syncActivityItemMarks\(tx, activityId, nextScoringMode, nextTotalMarks\)/);
  assert.match(service, /await syncActivityItemMarks\(tx, activityId, record\.scoringMode, record\.totalMarks\)/);
  assert.match(routes, /router\.get\("\/:activityId\/publish-readiness", read, controller\.getDigitalActivityPublishReadinessController\)/);
});
