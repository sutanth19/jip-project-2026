import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { MasteryLevel, Prisma, ProgressTrend } from "@prisma/client";
import { aggregateTrend, decimalAverage, masteryDistribution, masteryProgress, percentage } from "../src/services/analytics.service.js";
import { reportFiltersSchema } from "../src/validators/report.validator.js";

test("analytics use Decimal-safe averages, rounded percentages, and a documented mastery visualisation policy", () => {
  assert.equal(decimalAverage([new Prisma.Decimal("1.10"), new Prisma.Decimal("2.20")]), 1.65);
  assert.equal(percentage(1, 3), 33.33);
  assert.equal(masteryProgress([MasteryLevel.EMERGING, MasteryLevel.MASTERED]), 62.5);
  assert.deepEqual(masteryDistribution([MasteryLevel.MASTERED, MasteryLevel.MASTERED]), { NOT_STARTED: 0, EMERGING: 0, DEVELOPING: 0, ACHIEVED: 0, MASTERED: 2 });
});

test("analytics trends remain deterministic and conservative with insufficient data", () => {
  assert.equal(aggregateTrend([]), ProgressTrend.INSUFFICIENT_DATA);
  assert.equal(aggregateTrend([ProgressTrend.IMPROVING, ProgressTrend.IMPROVING, ProgressTrend.DECLINING]), ProgressTrend.IMPROVING);
  assert.equal(aggregateTrend([ProgressTrend.DECLINING, ProgressTrend.IMPROVING]), ProgressTrend.INSUFFICIENT_DATA);
});

test("report filters validate UUIDs, pagination, sort allowlists, and chronological date ranges", () => {
  const result = reportFiltersSchema.parse({ schoolId: "11111111-1111-4111-8111-111111111111", dateFrom: "2026-01-01", dateTo: "2026-01-31", sortBy: "percentage" });
  assert.equal(result.page, 1);
  assert.equal(result.limit, 20);
  assert.throws(() => reportFiltersSchema.parse({ schoolId: "bad", unknown: true }));
  assert.throws(() => reportFiltersSchema.parse({ dateFrom: "2026-02-01", dateTo: "2026-01-01" }));
});

test("report DTO implementation avoids raw answers, answer keys, private PBD notes, exports, and predictive analytics", async () => {
  const source = await readFile(new URL("../src/services/report.service.ts", import.meta.url), "utf8");
  assert.doesNotMatch(source, /StudentAnswer|correctAnswer|internalNotes|teacherNote|PDF|Excel|predictive|recommendation/i);
  assert.match(source, /header: reportHeader/);
  assert.match(source, /charts:/);
});
