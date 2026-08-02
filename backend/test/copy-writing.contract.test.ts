import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  COPY_WRITING_MAX_BYTES,
  CopyWritingContractError,
  copyWritingPreviewConfiguration,
  validateCopyWritingConfiguration,
  validateCopyWritingMedia,
} from "../src/contracts/copy-writing.contract.js";

const audioKey = "activity-audio/2026/07/00000000-0000-4000-8000-000000000011.mp3";

function validContract(): unknown {
  return {
    copyWriting: {
      contentMode: "WORD",
      referenceText: "baju",
      repetitionCount: 3,
      canvas: { width: 1000, height: 420 },
      writingLayout: {
        lineStyle: "FOUR_LINE",
        lineCount: 3,
        lineSpacing: 110,
        showTopLine: true,
        showMidline: true,
        showBaseline: true,
        showDescenderLine: true,
      },
      referenceDisplay: { position: "TOP", fontSize: 72, showSyllableBreaks: false, syllableSeparator: " · " },
      writingDirection: "LEFT_TO_RIGHT",
      tools: { allowPen: true, allowEraser: true, allowUndo: true, allowRedo: true, allowClear: true, allowStrokeWidthChange: false, defaultStrokeWidth: 6 },
      completion: { minimumStrokeCount: 1, requireAllRepetitions: true },
      allowRetry: true,
      clearOnRetry: false,
      hint: { type: "SHOW_REFERENCE" },
    },
  };
}

function clone(value: unknown): Record<string, unknown> {
  return JSON.parse(JSON.stringify(value)) as Record<string, unknown>;
}

function definition(value: Record<string, unknown>): Record<string, unknown> {
  return value.copyWriting as Record<string, unknown>;
}

function rejects(value: unknown, issue: string): void {
  assert.throws(
    () => validateCopyWritingConfiguration(value),
    (caught: unknown) => caught instanceof CopyWritingContractError && caught.issues.includes(issue as never),
  );
}

test("Copy Writing accepts all explicit content modes", () => {
  for (const contentMode of ["LETTER", "SYLLABLE", "WORD", "PHRASE", "SENTENCE"] as const) {
    const contract = clone(validContract());
    definition(contract).contentMode = contentMode;
    definition(contract).referenceText = contentMode === "LETTER" ? "A" : contentMode === "SYLLABLE" ? "ba" : contentMode === "PHRASE" ? "baju biru" : contentMode === "SENTENCE" ? "Ali memakai baju." : "baju";
    assert.equal(validateCopyWritingConfiguration(contract).copyWriting.contentMode, contentMode);
  }
});

test("Copy Writing requires a safe bounded NFC-normalized reference text", () => {
  const missing = clone(validContract());
  delete definition(missing).referenceText;
  rejects(missing, "COPY_WRITING_REFERENCE_TEXT_REQUIRED");
  const empty = clone(validContract());
  definition(empty).referenceText = "  ";
  rejects(empty, "COPY_WRITING_REFERENCE_TEXT_REQUIRED");
  const tooLong = clone(validContract());
  definition(tooLong).contentMode = "WORD";
  definition(tooLong).referenceText = "a".repeat(51);
  rejects(tooLong, "COPY_WRITING_REFERENCE_TEXT_TOO_LONG");
  const unicode = clone(validContract());
  definition(unicode).contentMode = "LETTER";
  definition(unicode).referenceText = "A\u0301";
  assert.equal(validateCopyWritingConfiguration(unicode).copyWriting.referenceText, "Á");
});

test("Copy Writing validates repetitions, canvas geometry, layout, and reference display", () => {
  const tooFew = clone(validContract());
  definition(tooFew).repetitionCount = 0;
  rejects(tooFew, "COPY_WRITING_REPETITION_INVALID");
  const tooMany = clone(validContract());
  definition(tooMany).repetitionCount = 11;
  rejects(tooMany, "COPY_WRITING_REPETITION_INVALID");
  const invalidWidth = clone(validContract());
  definition(invalidWidth).canvas = { width: 399, height: 420 };
  rejects(invalidWidth, "COPY_WRITING_CANVAS_INVALID");
  const invalidHeight = clone(validContract());
  definition(invalidHeight).canvas = { width: 1000, height: 1601 };
  rejects(invalidHeight, "COPY_WRITING_CANVAS_INVALID");
  const layout = definition(validContract()).writingLayout as Record<string, unknown>;
  const invalidStyle = clone(validContract());
  (definition(invalidStyle).writingLayout as Record<string, unknown>).lineStyle = "GRID";
  rejects(invalidStyle, "COPY_WRITING_LAYOUT_INVALID");
  const insufficient = clone(validContract());
  (definition(insufficient).writingLayout as Record<string, unknown>).lineCount = 2;
  rejects(insufficient, "COPY_WRITING_LAYOUT_INVALID");
  assert.equal(layout.lineStyle, "FOUR_LINE");
  const invalidSpacing = clone(validContract());
  (definition(invalidSpacing).writingLayout as Record<string, unknown>).lineSpacing = 0;
  rejects(invalidSpacing, "COPY_WRITING_LAYOUT_INVALID");
  const invalidPosition = clone(validContract());
  (definition(invalidPosition).referenceDisplay as Record<string, unknown>).position = "RIGHT";
  rejects(invalidPosition, "COPY_WRITING_REFERENCE_DISPLAY_INVALID");
  const invalidFont = clone(validContract());
  (definition(invalidFont).referenceDisplay as Record<string, unknown>).fontSize = 161;
  rejects(invalidFont, "COPY_WRITING_REFERENCE_DISPLAY_INVALID");
});

test("Copy Writing validates direction, tools, completion, and explicit hint media", async () => {
  const direction = clone(validContract());
  definition(direction).writingDirection = "RIGHT_TO_LEFT";
  rejects(direction, "COPY_WRITING_WRITING_DIRECTION_INVALID");
  const pen = clone(validContract());
  (definition(pen).tools as Record<string, unknown>).allowPen = false;
  rejects(pen, "COPY_WRITING_TOOL_CONFIG_INVALID");
  const width = clone(validContract());
  (definition(width).tools as Record<string, unknown>).defaultStrokeWidth = 21;
  rejects(width, "COPY_WRITING_TOOL_CONFIG_INVALID");
  const redo = clone(validContract());
  (definition(redo).tools as Record<string, unknown>).allowUndo = false;
  rejects(redo, "COPY_WRITING_TOOL_CONFIG_INVALID");
  const completion = clone(validContract());
  (definition(completion).completion as Record<string, unknown>).minimumStrokeCount = 0;
  rejects(completion, "COPY_WRITING_COMPLETION_INVALID");
  const missingAudio = clone(validContract());
  definition(missingAudio).hint = { type: "PLAY_REFERENCE_AUDIO" };
  rejects(missingAudio, "COPY_WRITING_HINT_INVALID");
  const audio = clone(validContract());
  definition(audio).hint = { type: "PLAY_REFERENCE_AUDIO" };
  definition(audio).media = { referenceAudioKey: audioKey };
  const parsed = validateCopyWritingConfiguration(audio);
  await validateCopyWritingMedia(parsed, async (key) => assert.equal(key, audioKey));
});

test("Copy Writing permits syllable display only with explicit valid units", () => {
  const syllables = clone(validContract());
  definition(syllables).referenceText = "sekolah";
  definition(syllables).repetitionCount = 1;
  const writingLayout = definition(syllables).writingLayout as Record<string, unknown>;
  writingLayout.lineCount = 1;
  const display = definition(syllables).referenceDisplay as Record<string, unknown>;
  display.showSyllableBreaks = true;
  definition(syllables).syllableUnits = [
    { id: "S1", value: "se", sequence: 1 },
    { id: "S2", value: "ko", sequence: 2 },
    { id: "S3", value: "lah", sequence: 3 },
  ];
  assert.deepEqual(validateCopyWritingConfiguration(syllables).copyWriting.syllableUnits.map((unit) => unit.value), ["se", "ko", "lah"]);
  const duplicate = clone(syllables);
  (definition(duplicate).syllableUnits as Array<Record<string, unknown>>)[1]!.id = "S1";
  rejects(duplicate, "COPY_WRITING_SYLLABLE_UNITS_INVALID");
  const mismatch = clone(syllables);
  (definition(mismatch).syllableUnits as Array<Record<string, unknown>>)[2]!.value = "lam";
  rejects(mismatch, "COPY_WRITING_SYLLABLE_UNITS_INVALID");
  const missing = clone(validContract());
  (definition(missing).referenceDisplay as Record<string, unknown>).showSyllableBreaks = true;
  rejects(missing, "COPY_WRITING_SYLLABLE_UNITS_INVALID");
});

test("Copy Writing rejects unsafe content, excessive depth, oversized input, and prototype pollution", () => {
  const html = clone(validContract());
  definition(html).referenceText = "<b>baju</b>";
  rejects(html, "COPY_WRITING_UNSAFE_CONTENT");
  const javascript = clone(validContract());
  definition(javascript).referenceText = "javascript:alert(1)";
  rejects(javascript, "COPY_WRITING_UNSAFE_CONTENT");
  const url = clone(validContract());
  definition(url).referenceText = "https://example.test";
  rejects(url, "COPY_WRITING_UNSAFE_CONTENT");
  const template = clone(validContract());
  definition(template).referenceText = "{{word}}";
  rejects(template, "COPY_WRITING_REFERENCE_TEXT_REQUIRED");
  const oversized = clone(validContract());
  definition(oversized).referenceText = "b".repeat(COPY_WRITING_MAX_BYTES);
  rejects(oversized, "COPY_WRITING_CONFIGURATION_TOO_LARGE");
  const deep = JSON.parse('{"copyWriting":{"contentMode":"WORD","referenceText":"baju","repetitionCount":3,"canvas":{"width":1000,"height":420},"writingLayout":{"lineStyle":"FOUR_LINE","lineCount":3,"lineSpacing":110,"showTopLine":true,"showMidline":true,"showBaseline":true,"showDescenderLine":true},"referenceDisplay":{"position":"TOP","fontSize":72,"showSyllableBreaks":false,"syllableSeparator":" · "},"writingDirection":"LEFT_TO_RIGHT","tools":{"allowPen":true,"allowEraser":true,"allowUndo":true,"allowRedo":true,"allowClear":true,"allowStrokeWidthChange":false,"defaultStrokeWidth":6},"completion":{"minimumStrokeCount":1,"requireAllRepetitions":true},"nested":{"a":{"b":{"c":{"d":{"e":{"f":{"g":1}}}}}}}}}') as unknown;
  rejects(deep, "COPY_WRITING_CONFIGURATION_TOO_DEEP");
  const polluted = JSON.parse('{"copyWriting":{"__proto__":{},"contentMode":"WORD"}}') as unknown;
  rejects(polluted, "COPY_WRITING_UNSAFE_CONTENT");
});

test("Copy Writing preview returns the normalized contract and safe media DTOs", () => {
  const contract = clone(validContract());
  definition(contract).hint = { type: "PLAY_REFERENCE_AUDIO" };
  definition(contract).media = { referenceAudioKey: audioKey };
  const preview = copyWritingPreviewConfiguration(validateCopyWritingConfiguration(contract), new Map([[audioKey, { url: "/media/audio", mimeType: "audio/mpeg", altText: "Baju", label: "/private/tmp/hidden.mp3" }]]));
  assert.equal(preview.copyWriting.referenceText, "baju");
  assert.deepEqual(preview.copyWriting.canvas, { width: 1000, height: 420 });
  assert.equal(preview.copyWriting.tools.allowPen, true);
  assert.equal(preview.copyWriting.completion.minimumStrokeCount, 1);
  assert.deepEqual(preview.copyWriting.hint, { type: "PLAY_REFERENCE_AUDIO", media: [{ key: audioKey, url: "/media/audio", mimeType: "audio/mpeg", altText: "Baju", label: null }] });
});

test("Copy Writing workflow blocks malformed contracts, flags legacy items, and keeps other preview mappings", async () => {
  const service = await readFile(new URL("../src/services/digitalActivity.service.ts", import.meta.url), "utf8");
  assert.match(service, /COPY_WRITING_CONTRACT_INVALID/);
  assert.match(service, /DIGITAL_ACTIVITY_PUBLICATION_INVALID/);
  assert.match(service, /EXPLICIT_COPY_WRITING_CONTRACT_REQUIRED/);
  assert.match(service, /rendererKey === "copy-writing"/);
  assert.match(service, /legacyCopyWriting/);
  assert.match(service, /copyWriting\?\.configuration \?\? reading\?\.configuration \?\? freeHandwriting\?\.configuration \?\? readingComprehension\?\.configuration \?\? voiceRecording\?\.configuration \?\? item\.configuration/);
});

test("Copy Writing adds no assignment, attempt, submission, assessment, OCR, or AI model", async () => {
  const schema = await readFile(new URL("../prisma/schema.prisma", import.meta.url), "utf8");
  assert.doesNotMatch(schema, /CopyWriting(?:Attempt|Submission|Assignment|Mastery|Assessment|Ocr|AI)/);
});
