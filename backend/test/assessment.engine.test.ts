import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { AssessmentItemStatus, AssessmentMethod, AssessmentResult, AssessmentStatus, MarkAdjustmentReason, Prisma, QuestionAnswerType } from "@prisma/client";
import { evaluateAutomaticItem } from "../src/services/assessment-auto.service.js";
import { calculateAssessmentTotals } from "../src/services/assessment-calculation.js";
import { assessmentMethod, itemAssessmentMethod } from "../src/services/assessment-policy.js";
import { adjustmentSchema, listAssessmentsQuerySchema, manualScoreSchema } from "../src/validators/assessment.validator.js";

test("assessment policy separates automatic, manual, completion, and hybrid methods", () => {
  assert.equal(itemAssessmentMethod("multiple-choice", {}, QuestionAnswerType.SINGLE_CHOICE, false), AssessmentMethod.AUTOMATIC);
  assert.equal(itemAssessmentMethod("free-handwriting", {}, QuestionAnswerType.NONE, false), AssessmentMethod.MANUAL);
  assert.equal(itemAssessmentMethod("reading", {}, QuestionAnswerType.NONE, false), AssessmentMethod.COMPLETION);
  assert.equal(itemAssessmentMethod("reading-comprehension", { readingComprehension: { questions: [{ type: "SHORT_TEXT" }] } }, QuestionAnswerType.TEXT, false), AssessmentMethod.MANUAL);
  assert.equal(assessmentMethod([AssessmentMethod.AUTOMATIC, AssessmentMethod.MANUAL]), AssessmentMethod.HYBRID);
});

test("automatic evaluator uses backend answer options for objective choices", () => {
  const result = evaluateAutomaticItem({
    rendererKey: "multiple-choice",
    method: AssessmentMethod.AUTOMATIC,
    configuration: {},
    possibleMarks: new Prisma.Decimal(2),
    question: {
      answerType: QuestionAnswerType.SINGLE_CHOICE,
      correctAnswer: null,
      answerOptions: [
        { id: "A", label: "A", content: "Buku", isCorrect: true, sequence: 1 },
        { id: "B", label: "B", content: "Bola", isCorrect: false, sequence: 2 },
      ],
    },
    answerJson: { selectedOptionId: "A" },
    isCompleted: true,
  });
  assert.equal(result.status, AssessmentItemStatus.AUTO_ASSESSED);
  assert.equal(result.correct, true);
  assert.equal(result.marksAwarded.toString(), "2");
});

test("fill blank evaluator awards proportional marks from published acceptable answers", () => {
  const result = evaluateAutomaticItem({
    rendererKey: "fill-blank",
    method: AssessmentMethod.AUTOMATIC,
    configuration: {
      fillBlank: {
        mode: "TYPING",
        prompt: "{{blank:1}} makan {{blank:2}}.",
        blanks: [
          { id: "blank-1", marker: "{{blank:1}}", required: true, inputMode: "TYPING", acceptableAnswers: ["Ali"] },
          { id: "blank-2", marker: "{{blank:2}}", required: true, inputMode: "TYPING", acceptableAnswers: ["nasi"] },
        ],
        wordBank: [],
        allowRepeatedWords: false,
      },
    },
    possibleMarks: new Prisma.Decimal(4),
    question: { answerType: QuestionAnswerType.TEXT, correctAnswer: null, answerOptions: [] },
    answerJson: { answers: { "blank-1": " ali ", "blank-2": "roti" } },
    isCompleted: true,
  });
  assert.equal(result.correct, false);
  assert.equal(result.marksAwarded.toString(), "2");
});

test("assessment calculation keeps decimal totals, adjustments, and pass threshold explicit", () => {
  const totals = calculateAssessmentTotals({
    items: [
      { status: AssessmentItemStatus.AUTO_ASSESSED, marksAwarded: new Prisma.Decimal("1.25"), possibleMarks: new Prisma.Decimal("2.50") },
      { status: AssessmentItemStatus.MANUALLY_ASSESSED, marksAwarded: new Prisma.Decimal("2.00"), possibleMarks: new Prisma.Decimal("2.50") },
    ],
    adjustments: [{ difference: new Prisma.Decimal("0.25") }],
    passPercentage: new Prisma.Decimal(70),
  });
  assert.equal(totals.finalMarks.toString(), "3.5");
  assert.equal(totals.percentage?.toString(), "70");
  assert.equal(totals.result, AssessmentResult.PASSED);
  assert.equal(totals.status, AssessmentStatus.COMPLETED);
});

test("assessment validators bound marks, filters, reasons, and manual scoring", () => {
  assert.equal(listAssessmentsQuerySchema.parse({ page: "2", status: AssessmentStatus.COMPLETED }).page, 2);
  assert.equal(adjustmentSchema.parse({ newMarks: 7.5, reason: MarkAdjustmentReason.TEACHER_CORRECTION }).reason, MarkAdjustmentReason.TEACHER_CORRECTION);
  assert.equal(manualScoreSchema.parse({ marksAwarded: 3, possibleMarks: 5 }).marksAwarded, 3);
  assert.throws(() => manualScoreSchema.parse({ marksAwarded: -1 }));
  assert.throws(() => manualScoreSchema.parse({ marksAwarded: 6, possibleMarks: 5 }));
});

test("assessment migration is additive and does not store answer keys in audit summaries", async () => {
  const sql = await readFile(new URL("../prisma/migrations/20260728130000_assessment_engine/migration.sql", import.meta.url), "utf8");
  const app = await readFile(new URL("../src/app.ts", import.meta.url), "utf8");
  const audit = await readFile(new URL("../src/services/audit.service.ts", import.meta.url), "utf8");
  assert.match(sql, /CREATE TABLE "assessments"/);
  assert.match(sql, /CREATE TABLE "assessment_items"/);
  assert.match(sql, /CREATE TABLE "assessment_adjustments"/);
  assert.match(sql, /CREATE UNIQUE INDEX "assessments_submissionId_key"/);
  assert.doesNotMatch(sql, /\bDROP\b/i);
  assert.match(app, /\/api\/assessments/);
  assert.match(app, /\/api\/student\/assessments/);
  assert.match(audit, /ASSESSMENT_CREATED/);
  assert.doesNotMatch(audit, /answerKey/i);
});
