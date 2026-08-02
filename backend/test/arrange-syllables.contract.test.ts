import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  ARRANGE_SYLLABLES_MAX_BYTES,
  ArrangeSyllablesContractError,
  arrangeSyllablesPreviewConfiguration,
  validateArrangeSyllablesConfiguration,
} from "../src/contracts/arrange-syllables.contract.js";

function validContract(): unknown {
  return {
    arrangeSyllables: {
      interactionMode: "CLICK_ORDER",
      targetWord: "SEKOLAH",
      syllables: [
        { id: "S1", value: "SE", sequence: 1 },
        { id: "S2", value: "KO", sequence: 2 },
        { id: "S3", value: "LAH", sequence: 3 },
      ],
      showReferenceText: false,
      showTargetSlots: true,
      shuffleSyllables: true,
      allowRetry: true,
      clearOnRetry: false,
      maximumSyllables: 10,
    },
  };
}

function clone(value: unknown): Record<string, unknown> {
  return JSON.parse(JSON.stringify(value)) as Record<string, unknown>;
}

function definition(value: Record<string, unknown>): Record<string, unknown> {
  return value.arrangeSyllables as Record<string, unknown>;
}

function syllables(value: Record<string, unknown>): Array<Record<string, unknown>> {
  return definition(value).syllables as Array<Record<string, unknown>>;
}

function rejects(value: unknown, issue: string): void {
  assert.throws(
    () => validateArrangeSyllablesConfiguration(value),
    (caught: unknown) => caught instanceof ArrangeSyllablesContractError && caught.issues.includes(issue as never),
  );
}

test("Arrange Syllables accepts a complete explicit contract", () => {
  const contract = validateArrangeSyllablesConfiguration(validContract());
  assert.equal(contract.arrangeSyllables.interactionMode, "CLICK_ORDER");
  assert.equal(contract.arrangeSyllables.targetWord, "SEKOLAH");
  assert.equal(contract.arrangeSyllables.maximumSyllables, 10);
});

test("Arrange Syllables permits repeated syllable values with unique IDs", () => {
  const repeated = clone(validContract());
  definition(repeated).targetWord = "MAMAMA";
  definition(repeated).syllables = [
    { id: "MA-1", value: "MA", sequence: 1 },
    { id: "MA-2", value: "MA", sequence: 2 },
    { id: "MA-3", value: "MA", sequence: 3 },
  ];
  assert.deepEqual(validateArrangeSyllablesConfiguration(repeated).arrangeSyllables.syllables.map((syllable) => syllable.id), ["MA-1", "MA-2", "MA-3"]);
});

test("Arrange Syllables rejects duplicate IDs and duplicate sequences", () => {
  const duplicateId = clone(validContract());
  syllables(duplicateId)[1]!.id = "S1";
  rejects(duplicateId, "ARRANGE_SYLLABLE_ID_DUPLICATE");
  const duplicateSequence = clone(validContract());
  syllables(duplicateSequence)[1]!.sequence = 1;
  rejects(duplicateSequence, "ARRANGE_SYLLABLE_SEQUENCE_DUPLICATE");
});

test("Arrange Syllables validates contiguous sequence, reconstruction, NFC, and maximum length", () => {
  const nonContiguous = clone(validContract());
  syllables(nonContiguous)[2]!.sequence = 4;
  rejects(nonContiguous, "ARRANGE_SYLLABLE_SEQUENCE_ORDER_INVALID");
  const reconstruction = clone(validContract());
  syllables(reconstruction)[2]!.value = "HLA";
  rejects(reconstruction, "ARRANGE_SYLLABLE_RECONSTRUCTION_INVALID");
  const maximum = clone(validContract());
  definition(maximum).maximumSyllables = 2;
  rejects(maximum, "ARRANGE_SYLLABLES_REQUIRED");
  const unicode = clone(validContract());
  definition(unicode).targetWord = "BAHASA\u0301";
  definition(unicode).syllables = [
    { id: "BA", value: "BA", sequence: 1 },
    { id: "HA", value: "HA", sequence: 2 },
    { id: "SA", value: "SA\u0301", sequence: 3 },
  ];
  assert.equal(validateArrangeSyllablesConfiguration(unicode).arrangeSyllables.targetWord, "BAHASÁ");
});

test("Arrange Syllables rejects oversized, HTML, JavaScript, URL, and template content", () => {
  const oversized = clone(validContract());
  definition(oversized).targetWord = "S".repeat(ARRANGE_SYLLABLES_MAX_BYTES);
  rejects(oversized, "ARRANGE_SYLLABLES_CONFIGURATION_TOO_LARGE");
  const html = clone(validContract());
  syllables(html)[0]!.value = "<b>SE</b>";
  rejects(html, "ARRANGE_SYLLABLES_UNSAFE_CONTENT");
  const javascript = clone(validContract());
  definition(javascript).targetWord = "javascript:alert(1)";
  rejects(javascript, "ARRANGE_SYLLABLES_UNSAFE_CONTENT");
  const url = clone(validContract());
  syllables(url)[0]!.value = "https://example.test";
  rejects(url, "ARRANGE_SYLLABLES_UNSAFE_CONTENT");
  const template = clone(validContract());
  definition(template).targetWord = "{{word}}";
  rejects(template, "ARRANGE_SYLLABLES_TARGET_WORD_REQUIRED");
});

test("Arrange Syllables preview returns the full ordered explicit configuration", () => {
  const preview = arrangeSyllablesPreviewConfiguration(validateArrangeSyllablesConfiguration(validContract()));
  assert.deepEqual(preview.arrangeSyllables, {
    interactionMode: "CLICK_ORDER",
    targetWord: "SEKOLAH",
    syllables: [
      { id: "S1", value: "SE", sequence: 1 },
      { id: "S2", value: "KO", sequence: 2 },
      { id: "S3", value: "LAH", sequence: 3 },
    ],
    showReferenceText: false,
    showTargetSlots: true,
    shuffleSyllables: true,
    allowRetry: true,
    clearOnRetry: false,
    maximumSyllables: 10,
  });
});

test("Arrange Syllables workflow blocks invalid contracts and marks legacy preview items incomplete", async () => {
  const service = await readFile(new URL("../src/services/digitalActivity.service.ts", import.meta.url), "utf8");
  assert.match(service, /ARRANGE_SYLLABLES_CONTRACT_INVALID/);
  assert.match(service, /DIGITAL_ACTIVITY_PUBLICATION_INVALID/);
  assert.match(service, /EXPLICIT_ARRANGE_SYLLABLES_CONTRACT_REQUIRED/);
  assert.match(service, /rendererKey === "arrange-syllables"/);
  assert.match(service, /legacyArrangeSyllables/);
});

test("Arrange Syllables adds no attempt, assignment, assessment, or AI model", async () => {
  const schema = await readFile(new URL("../prisma/schema.prisma", import.meta.url), "utf8");
  assert.doesNotMatch(schema, /ArrangeSyllables(?:Attempt|Submission|Assignment|Mastery|Assessment)/);
});
