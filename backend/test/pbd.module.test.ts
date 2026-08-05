import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { EvidenceStrength, EvidenceType, MasteryLevel, Prisma, ProgressTrend } from "@prisma/client";
import { calculateMasteryRecommendation, calculateTrend } from "../src/services/mastery-recommendation.service.js";
import { observationSchema } from "../src/validators/pbd.validator.js";

const evidence = (percentage: number | null, observedAt: string, overrides: Partial<{ completionOnly: boolean; evidenceType: EvidenceType; strength: EvidenceStrength; observedLevel: MasteryLevel | null; digitalActivityId: string | null }> = {}) => ({ percentage: percentage === null ? null : new Prisma.Decimal(percentage), completionOnly: false, evidenceType: EvidenceType.AUTOMATIC_ASSESSMENT, strength: EvidenceStrength.STANDARD, observedLevel: null, digitalActivityId: "11111111-1111-4111-8111-111111111111", observedAt: new Date(observedAt), ...overrides });

test("PBD recommendation is deterministic, evidence-gated, and never promotes completion-only marks", () => {
  assert.equal(calculateMasteryRecommendation([]).recommendedLevel, MasteryLevel.NOT_STARTED);
  assert.equal(calculateMasteryRecommendation([evidence(100, "2026-01-01", { completionOnly: true, evidenceType: EvidenceType.ACTIVITY_COMPLETION })]).recommendedLevel, MasteryLevel.EMERGING);
  const recommendation = calculateMasteryRecommendation([evidence(90, "2026-01-01"), evidence(88, "2026-01-02"), evidence(92, "2026-01-03", { digitalActivityId: "22222222-2222-4222-8222-222222222222" })]);
  assert.equal(recommendation.recommendedLevel, MasteryLevel.MASTERED);
  assert.ok(recommendation.confidencePercentage.gte(0) && recommendation.confidencePercentage.lte(100));
});

test("PBD trend compares quantitative evidence windows with Decimal values", () => {
  assert.equal(calculateTrend([evidence(40, "2026-01-01"), evidence(45, "2026-01-02"), evidence(80, "2026-01-03"), evidence(85, "2026-01-04")]), ProgressTrend.IMPROVING);
  assert.equal(calculateTrend([evidence(80, "2026-01-01"), evidence(80, "2026-01-02")]), ProgressTrend.INSUFFICIENT_DATA);
});

test("PBD observation validation rejects unknown fields and requires safe summary", () => {
  const valid = { studentId: "11111111-1111-4111-8111-111111111111", remedialSkillId: "22222222-2222-4222-8222-222222222222", learningStandardId: null, learningObjectiveId: null, strength: EvidenceStrength.STANDARD, observedLevel: MasteryLevel.DEVELOPING, summary: "Murid menunjukkan kemajuan dengan bimbingan.", observedAt: "2026-07-28T00:00:00.000Z" };
  assert.equal(observationSchema.parse(valid).observedLevel, MasteryLevel.DEVELOPING);
  assert.throws(() => observationSchema.parse({ ...valid, summary: "", schoolId: "33333333-3333-4333-8333-333333333333" }));
});

test("PBD migration is additive, uses a non-null current-record scope key, and excludes AI models", async () => {
  const sql = await readFile(new URL("../prisma/migrations/20260728150000_pbd_progress_mastery/migration.sql", import.meta.url), "utf8");
  assert.match(sql, /CREATE TABLE "pbd_evidence"/);
  assert.match(sql, /CREATE TABLE "student_mastery"/);
  assert.match(sql, /"scopeKey" TEXT NOT NULL/);
  assert.match(sql, /student_mastery_studentId_curriculumVersionId_scopeKey_key/);
  assert.doesNotMatch(sql, /DROP\s|TRUNCATE\s|\bAI\b|certificate|notification/i);
});
