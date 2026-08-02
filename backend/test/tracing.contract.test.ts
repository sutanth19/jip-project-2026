import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  TRACING_MAX_BYTES,
  TracingContractError,
  tracingPreviewConfiguration,
  validateTracingConfiguration,
} from "../src/contracts/tracing.contract.js";

function validContract(): unknown {
  return {
    tracing: {
      traceMode: "WORD",
      displayText: "BAJU",
      traceUnits: [
        { id: "T1", value: "BAJU", svgPath: "M 20 20 L 200 20 L 200 120", sequence: 1 },
      ],
      canvas: { width: 900, height: 300 },
      guideStyle: "DOTTED",
      showBaseline: true,
      showStartDots: true,
      showStrokeNumbers: false,
      showGuideArrows: false,
      allowRetry: true,
      clearOnRetry: false,
      minimumAccuracy: 70,
      hint: { type: "SHOW_START_POINT" },
    },
  };
}

function clone(value: unknown): Record<string, unknown> {
  return JSON.parse(JSON.stringify(value)) as Record<string, unknown>;
}

function definition(value: Record<string, unknown>): Record<string, unknown> {
  return value.tracing as Record<string, unknown>;
}

function units(value: Record<string, unknown>): Array<Record<string, unknown>> {
  return definition(value).traceUnits as Array<Record<string, unknown>>;
}

function rejects(value: unknown, issue: string): void {
  assert.throws(
    () => validateTracingConfiguration(value),
    (caught: unknown) => caught instanceof TracingContractError && caught.issues.includes(issue as never),
  );
}

test("Tracing accepts a complete explicit contract", () => {
  const contract = validateTracingConfiguration(validContract());
  assert.equal(contract.tracing.traceMode, "WORD");
  assert.equal(contract.tracing.displayText, "BAJU");
  assert.equal(contract.tracing.canvas.width, 900);
});

test("Tracing supports every explicit trace mode", () => {
  for (const traceMode of ["LETTER", "NUMBER", "SYLLABLE", "WORD", "SENTENCE"] as const) {
    const contract = clone(validContract());
    definition(contract).traceMode = traceMode;
    assert.equal(validateTracingConfiguration(contract).tracing.traceMode, traceMode);
  }
});

test("Tracing normalizes Unicode while preserving supplied drawable paths", () => {
  const unicode = clone(validContract());
  definition(unicode).displayText = "A\u0301";
  units(unicode)[0]!.value = "A\u0301";
  const contract = validateTracingConfiguration(unicode);
  assert.equal(contract.tracing.displayText, "Á");
  assert.equal(contract.tracing.traceUnits[0]?.value, "Á");
  assert.equal(contract.tracing.traceUnits[0]?.svgPath, "M 20 20 L 200 20 L 200 120");
});

test("Tracing rejects duplicate unit IDs, duplicate sequences, and missing SVG paths", () => {
  const duplicateId = clone(validContract());
  definition(duplicateId).traceUnits = [
    { id: "T1", value: "BA", svgPath: "M 0 0 L 10 10", sequence: 1 },
    { id: "T1", value: "JU", svgPath: "M 20 0 L 30 10", sequence: 2 },
  ];
  rejects(duplicateId, "TRACING_UNIT_ID_DUPLICATE");
  const duplicateSequence = clone(validContract());
  definition(duplicateSequence).traceUnits = [
    { id: "T1", value: "BA", svgPath: "M 0 0 L 10 10", sequence: 1 },
    { id: "T2", value: "JU", svgPath: "M 20 0 L 30 10", sequence: 1 },
  ];
  rejects(duplicateSequence, "TRACING_SEQUENCE_DUPLICATE");
  const missingPath = clone(validContract());
  delete units(missingPath)[0]!.svgPath;
  rejects(missingPath, "TRACING_SVG_PATH_INVALID");
});

test("Tracing validates safe SVG path data, contiguous order, canvas dimensions, and minimum accuracy", () => {
  const invalidPath = clone(validContract());
  units(invalidPath)[0]!.svgPath = "not a path";
  rejects(invalidPath, "TRACING_SVG_PATH_INVALID");
  const nonContiguous = clone(validContract());
  definition(nonContiguous).traceUnits = [
    { id: "T1", value: "BA", svgPath: "M 0 0 L 10 10", sequence: 1 },
    { id: "T2", value: "JU", svgPath: "M 20 0 L 30 10", sequence: 3 },
  ];
  rejects(nonContiguous, "TRACING_SEQUENCE_ORDER_INVALID");
  const invalidCanvas = clone(validContract());
  definition(invalidCanvas).canvas = { width: 20, height: 3_000 };
  rejects(invalidCanvas, "TRACING_CANVAS_INVALID");
  const invalidGuideStyle = clone(validContract());
  definition(invalidGuideStyle).guideStyle = "ANIMATED";
  rejects(invalidGuideStyle, "TRACING_GUIDE_STYLE_INVALID");
  const invalidAccuracy = clone(validContract());
  definition(invalidAccuracy).minimumAccuracy = 101;
  rejects(invalidAccuracy, "TRACING_MINIMUM_ACCURACY_INVALID");
});

test("Tracing rejects unsafe HTML, JavaScript, URLs, template expressions, and oversized JSON", () => {
  const html = clone(validContract());
  units(html)[0]!.svgPath = "<path d='M 0 0'/>";
  rejects(html, "TRACING_UNSAFE_CONTENT");
  const javascript = clone(validContract());
  definition(javascript).displayText = "javascript:alert(1)";
  rejects(javascript, "TRACING_UNSAFE_CONTENT");
  const url = clone(validContract());
  units(url)[0]!.value = "https://example.test";
  rejects(url, "TRACING_UNSAFE_CONTENT");
  const template = clone(validContract());
  definition(template).displayText = "{{trace}}";
  rejects(template, "TRACING_DISPLAY_TEXT_REQUIRED");
  const oversized = clone(validContract());
  definition(oversized).displayText = "B".repeat(TRACING_MAX_BYTES);
  rejects(oversized, "TRACING_CONFIGURATION_TOO_LARGE");
});

test("Tracing preview returns the complete ordered explicit configuration", () => {
  const preview = tracingPreviewConfiguration(validateTracingConfiguration(validContract()));
  assert.deepEqual(preview.tracing, {
    traceMode: "WORD",
    displayText: "BAJU",
    traceUnits: [
      { id: "T1", value: "BAJU", svgPath: "M 20 20 L 200 20 L 200 120", sequence: 1 },
    ],
    canvas: { width: 900, height: 300 },
    guideStyle: "DOTTED",
    showBaseline: true,
    showStartDots: true,
    showStrokeNumbers: false,
    showGuideArrows: false,
    allowRetry: true,
    clearOnRetry: false,
    minimumAccuracy: 70,
    hint: { type: "SHOW_START_POINT" },
  });
});

test("Tracing workflow blocks malformed contracts, marks legacy items, and leaves other previews unchanged", async () => {
  const service = await readFile(new URL("../src/services/digitalActivity.service.ts", import.meta.url), "utf8");
  assert.match(service, /TRACING_CONTRACT_INVALID/);
  assert.match(service, /DIGITAL_ACTIVITY_PUBLICATION_INVALID/);
  assert.match(service, /EXPLICIT_TRACING_CONTRACT_REQUIRED/);
  assert.match(service, /rendererKey === "tracing"/);
  assert.match(service, /legacyTracing/);
  assert.match(service, /tracing\?\.configuration/);
  assert.match(service, /copyWriting\?\.configuration \?\? reading\?\.configuration \?\? freeHandwriting\?\.configuration \?\? readingComprehension\?\.configuration \?\? voiceRecording\?\.configuration \?\? item\.configuration/);
});

test("Tracing adds no attempt, assignment, assessment, OCR, or AI model", async () => {
  const schema = await readFile(new URL("../prisma/schema.prisma", import.meta.url), "utf8");
  assert.doesNotMatch(schema, /Tracing(?:Attempt|Submission|Assignment|Mastery|Assessment|Ocr|AI)/);
});
