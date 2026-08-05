import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  WORD_BUILDER_MAX_BYTES,
  WordBuilderContractError,
  validateWordBuilderMedia,
  wordBuilderMediaKeys,
  wordBuilderPreviewConfiguration,
  validateWordBuilderConfiguration,
} from "../src/contracts/word-builder.contract.js";

const imageKey = "activity-image/2026/07/00000000-0000-4000-8000-000000000001.png";
const audioKey = "activity-audio/2026/07/00000000-0000-4000-8000-000000000002.mp3";

function validContract(): unknown {
  return {
    wordBuilder: {
      builderMode: "SYLLABLE",
      interactionMode: "CLICK_ORDER",
      targetWord: "BAJU",
      units: [
        { id: "U1", value: "BA", sequence: 1 },
        { id: "U2", value: "JU", sequence: 2 },
      ],
      distractors: [
        { id: "D1", value: "KA" },
        { id: "D2", value: "TA" },
      ],
      showReferenceText: false,
      showTargetSlots: true,
      shuffleUnits: true,
      allowRetry: true,
      clearOnRetry: false,
      allowReuse: false,
      maximumUnits: 12,
      hint: { type: "FIRST_UNIT" },
    },
  };
}

function clone(value: unknown): Record<string, unknown> {
  return JSON.parse(JSON.stringify(value)) as Record<string, unknown>;
}

function definition(value: Record<string, unknown>): Record<string, unknown> {
  return value.wordBuilder as Record<string, unknown>;
}

function units(value: Record<string, unknown>): Array<Record<string, unknown>> {
  return definition(value).units as Array<Record<string, unknown>>;
}

function distractors(value: Record<string, unknown>): Array<Record<string, unknown>> {
  return definition(value).distractors as Array<Record<string, unknown>>;
}

function rejects(value: unknown, issue: string): void {
  assert.throws(
    () => validateWordBuilderConfiguration(value),
    (caught: unknown) => caught instanceof WordBuilderContractError && caught.issues.includes(issue as never),
  );
}

test("Word Builder accepts an explicit SYLLABLE contract with distractors and hints", () => {
  const contract = validateWordBuilderConfiguration(validContract());
  assert.equal(contract.wordBuilder.builderMode, "SYLLABLE");
  assert.equal(contract.wordBuilder.maximumUnits, 12);
  assert.equal(contract.wordBuilder.hint.type, "FIRST_UNIT");
  assert.deepEqual(contract.wordBuilder.distractors.map((distractor) => distractor.id), ["D1", "D2"]);
});

test("Word Builder supports LETTER mode only when each unit is one NFC grapheme", () => {
  const letters = clone(validContract());
  definition(letters).builderMode = "LETTER";
  definition(letters).units = [
    { id: "U1", value: "B", sequence: 1 },
    { id: "U2", value: "A", sequence: 2 },
    { id: "U3", value: "J", sequence: 3 },
    { id: "U4", value: "U", sequence: 4 },
  ];
  assert.equal(validateWordBuilderConfiguration(letters).wordBuilder.units.length, 4);
  units(letters)[0]!.value = "BA";
  rejects(letters, "WORD_BUILDER_UNIT_INVALID");
});

test("Word Builder permits repeated unit values when unit IDs remain unique", () => {
  const repeated = clone(validContract());
  definition(repeated).targetWord = "MAMA";
  definition(repeated).units = [
    { id: "MA-1", value: "MA", sequence: 1 },
    { id: "MA-2", value: "MA", sequence: 2 },
  ];
  assert.deepEqual(validateWordBuilderConfiguration(repeated).wordBuilder.units.map((unit) => unit.id), ["MA-1", "MA-2"]);
});

test("Word Builder rejects duplicate unit IDs, duplicate sequences, and invalid reconstruction", () => {
  const duplicateId = clone(validContract());
  units(duplicateId)[1]!.id = "U1";
  rejects(duplicateId, "WORD_BUILDER_UNIT_ID_DUPLICATE");
  const duplicateSequence = clone(validContract());
  units(duplicateSequence)[1]!.sequence = 1;
  rejects(duplicateSequence, "WORD_BUILDER_SEQUENCE_DUPLICATE");
  const reconstruction = clone(validContract());
  units(reconstruction)[1]!.value = "KA";
  rejects(reconstruction, "WORD_BUILDER_RECONSTRUCTION_INVALID");
});

test("Word Builder rejects invalid modes and maximum-unit violations", () => {
  const builderMode = clone(validContract());
  definition(builderMode).builderMode = "WORD";
  rejects(builderMode, "WORD_BUILDER_MODE_INVALID");
  const interactionMode = clone(validContract());
  definition(interactionMode).interactionMode = "TAP";
  rejects(interactionMode, "WORD_BUILDER_INTERACTION_MODE_INVALID");
  const maximum = clone(validContract());
  definition(maximum).maximumUnits = 1;
  rejects(maximum, "WORD_BUILDER_UNITS_REQUIRED");
});

test("Word Builder validates explicit distractors and their IDs", () => {
  const duplicate = clone(validContract());
  distractors(duplicate)[1]!.id = "D1";
  rejects(duplicate, "WORD_BUILDER_DISTRACTOR_ID_DUPLICATE");
  const conflict = clone(validContract());
  distractors(conflict)[0]!.id = "U1";
  rejects(conflict, "WORD_BUILDER_DISTRACTOR_ID_CONFLICT");
  const tooMany = clone(validContract());
  definition(tooMany).distractors = Array.from({ length: 21 }, (_, index) => ({ id: `D${index + 1}`, value: "X" }));
  rejects(tooMany, "WORD_BUILDER_DISTRACTOR_INVALID");
});

test("Word Builder supports explicit text, image, and audio prompts with compatible hints", async () => {
  const text = clone(validContract());
  definition(text).prompt = { type: "TEXT", text: "Bina perkataan" };
  definition(text).hint = { type: "NONE" };
  assert.equal(validateWordBuilderConfiguration(text).wordBuilder.prompt?.type, "TEXT");
  const image = clone(validContract());
  definition(image).prompt = { type: "IMAGE", mediaKey: imageKey };
  definition(image).hint = { type: "SHOW_IMAGE" };
  const imageContract = validateWordBuilderConfiguration(image);
  assert.deepEqual(wordBuilderMediaKeys(imageContract), [imageKey]);
  await validateWordBuilderMedia(imageContract, async (key) => assert.equal(key, imageKey));
  const audio = clone(validContract());
  definition(audio).prompt = { type: "AUDIO", mediaKey: audioKey };
  definition(audio).hint = { type: "PLAY_AUDIO" };
  assert.equal(validateWordBuilderConfiguration(audio).wordBuilder.prompt?.type, "AUDIO");
  definition(audio).hint = { type: "SHOW_IMAGE" };
  rejects(audio, "WORD_BUILDER_HINT_INVALID");
});

test("Word Builder rejects unsafe HTML, JavaScript, URLs, template expressions, and oversized JSON", () => {
  const html = clone(validContract());
  units(html)[0]!.value = "<b>BA</b>";
  rejects(html, "WORD_BUILDER_UNSAFE_CONTENT");
  const javascript = clone(validContract());
  definition(javascript).targetWord = "javascript:alert(1)";
  rejects(javascript, "WORD_BUILDER_UNSAFE_CONTENT");
  const url = clone(validContract());
  distractors(url)[0]!.value = "https://example.test";
  rejects(url, "WORD_BUILDER_UNSAFE_CONTENT");
  const template = clone(validContract());
  definition(template).targetWord = "{{word}}";
  rejects(template, "WORD_BUILDER_TARGET_WORD_REQUIRED");
  const oversized = clone(validContract());
  definition(oversized).targetWord = "B".repeat(WORD_BUILDER_MAX_BYTES);
  rejects(oversized, "WORD_BUILDER_CONFIGURATION_TOO_LARGE");
});

test("Word Builder preview returns the complete safe contract including prompt media", () => {
  const contract = clone(validContract());
  definition(contract).prompt = { type: "IMAGE", mediaKey: imageKey };
  definition(contract).hint = { type: "SHOW_IMAGE" };
  const preview = wordBuilderPreviewConfiguration(
    validateWordBuilderConfiguration(contract),
    new Map([[imageKey, { url: "/media/cat", mimeType: "image/png", altText: "Kucing", label: "Prompt" }]]),
  );
  assert.deepEqual(preview.wordBuilder, {
    builderMode: "SYLLABLE",
    interactionMode: "CLICK_ORDER",
    targetWord: "BAJU",
    units: [
      { id: "U1", value: "BA", sequence: 1 },
      { id: "U2", value: "JU", sequence: 2 },
    ],
    distractors: [
      { id: "D1", value: "KA" },
      { id: "D2", value: "TA" },
    ],
    prompt: { type: "IMAGE", text: null, media: [{ key: imageKey, url: "/media/cat", mimeType: "image/png", altText: "Kucing", label: "Prompt" }] },
    showReferenceText: false,
    showTargetSlots: true,
    shuffleUnits: true,
    allowRetry: true,
    clearOnRetry: false,
    allowReuse: false,
    maximumUnits: 12,
    hint: { type: "SHOW_IMAGE" },
  });
});

test("Word Builder workflow blocks malformed contracts, flags legacy items, and leaves other previews unchanged", async () => {
  const service = await readFile(new URL("../src/services/digitalActivity.service.ts", import.meta.url), "utf8");
  assert.match(service, /WORD_BUILDER_CONTRACT_INVALID/);
  assert.match(service, /DIGITAL_ACTIVITY_PUBLICATION_INVALID/);
  assert.match(service, /EXPLICIT_WORD_BUILDER_CONTRACT_REQUIRED/);
  assert.match(service, /rendererKey === "word-builder"/);
  assert.match(service, /legacyWordBuilder/);
  assert.match(service, /wordBuilder\?\.configuration/);
  assert.match(service, /tracing\?\.configuration/);
  assert.match(service, /copyWriting\?\.configuration \?\? reading\?\.configuration \?\? freeHandwriting\?\.configuration \?\? readingComprehension\?\.configuration \?\? voiceRecording\?\.configuration \?\? item\.configuration/);
});

test("Word Builder adds no attempt, assignment, assessment, or AI model", async () => {
  const schema = await readFile(new URL("../prisma/schema.prisma", import.meta.url), "utf8");
  assert.doesNotMatch(schema, /WordBuilder(?:Attempt|Submission|Assignment|Mastery|Assessment)/);
});
