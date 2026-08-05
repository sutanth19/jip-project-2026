import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  ARRANGE_LETTERS_MAX_BYTES,
  ArrangeLettersContractError,
  arrangeLettersPreviewConfiguration,
  validateArrangeLettersConfiguration,
} from "../src/contracts/arrange-letters.contract.js";

function validContract(): unknown {
  return {
    arrangeLetters: {
      interactionMode: "CLICK_ORDER",
      targetWord: "BAJU",
      letterUnits: [
        { id: "L1", value: "B", sequence: 1 },
        { id: "L2", value: "A", sequence: 2 },
        { id: "L3", value: "J", sequence: 3 },
        { id: "L4", value: "U", sequence: 4 },
      ],
      showReferenceText: false,
      showTargetSlots: true,
      shuffleLetters: true,
      preserveCase: false,
      allowRetry: true,
      clearOnRetry: false,
      maximumLetters: 20,
    },
  };
}

function clone(value: unknown): Record<string, unknown> {
  return JSON.parse(JSON.stringify(value)) as Record<string, unknown>;
}

function definition(value: Record<string, unknown>): Record<string, unknown> {
  return value.arrangeLetters as Record<string, unknown>;
}

function units(value: Record<string, unknown>): Array<Record<string, unknown>> {
  return definition(value).letterUnits as Array<Record<string, unknown>>;
}

function rejects(value: unknown, issue: string): void {
  assert.throws(
    () => validateArrangeLettersConfiguration(value),
    (caught: unknown) => caught instanceof ArrangeLettersContractError && caught.issues.includes(issue as never),
  );
}

test("Arrange Letters accepts a complete explicit contract and returns player defaults", () => {
  const contract = validateArrangeLettersConfiguration(validContract());
  assert.equal(contract.arrangeLetters.interactionMode, "CLICK_ORDER");
  assert.equal(contract.arrangeLetters.targetWord, "BAJU");
  assert.equal(contract.arrangeLetters.maximumLetters, 20);
});

test("Arrange Letters rejects duplicate IDs and duplicate sequences", () => {
  const duplicateId = clone(validContract());
  units(duplicateId)[1]!.id = "L1";
  rejects(duplicateId, "ARRANGE_LETTERS_LETTER_UNIT_ID_DUPLICATE");
  const duplicateSequence = clone(validContract());
  units(duplicateSequence)[1]!.sequence = 1;
  rejects(duplicateSequence, "ARRANGE_LETTERS_SEQUENCE_DUPLICATE");
});

test("Arrange Letters permits repeated letters when each unit ID remains unique", () => {
  const repeated = clone(validContract());
  definition(repeated).targetWord = "MAMA";
  definition(repeated).letterUnits = [
    { id: "M-1", value: "M", sequence: 1 },
    { id: "A-1", value: "A", sequence: 2 },
    { id: "M-2", value: "M", sequence: 3 },
    { id: "A-2", value: "A", sequence: 4 },
  ];
  assert.deepEqual(validateArrangeLettersConfiguration(repeated).arrangeLetters.letterUnits.map((unit) => unit.id), ["M-1", "A-1", "M-2", "A-2"]);
});

test("Arrange Letters validates ordered reconstruction, contiguous sequences, and maximum letters", () => {
  const reconstruction = clone(validContract());
  units(reconstruction)[3]!.value = "A";
  rejects(reconstruction, "ARRANGE_LETTERS_RECONSTRUCTION_INVALID");
  const sequence = clone(validContract());
  units(sequence)[3]!.sequence = 5;
  rejects(sequence, "ARRANGE_LETTERS_SEQUENCE_ORDER_INVALID");
  const tooMany = clone(validContract());
  definition(tooMany).maximumLetters = 3;
  rejects(tooMany, "ARRANGE_LETTERS_MAXIMUM_LETTERS_INVALID");
});

test("Arrange Letters uses NFC grapheme segmentation rather than UTF-16 splitting", () => {
  const unicode = clone(validContract());
  definition(unicode).targetWord = "A\u0301";
  definition(unicode).letterUnits = [{ id: "accent-1", value: "A\u0301", sequence: 1 }];
  const contract = validateArrangeLettersConfiguration(unicode);
  assert.equal(contract.arrangeLetters.targetWord, "Á");
  assert.equal(contract.arrangeLetters.letterUnits[0]?.value, "Á");
  const family = clone(validContract());
  definition(family).targetWord = "👨‍👩‍👧‍👦";
  definition(family).letterUnits = [{ id: "family-1", value: "👨‍👩‍👧‍👦", sequence: 1 }];
  assert.equal(validateArrangeLettersConfiguration(family).arrangeLetters.letterUnits.length, 1);
});

test("Arrange Letters rejects unsafe content and oversized configuration", () => {
  const html = clone(validContract());
  definition(html).targetWord = "<b>BAJU</b>";
  rejects(html, "ARRANGE_LETTERS_UNSAFE_CONTENT");
  const javascript = clone(validContract());
  definition(javascript).targetWord = "javascript:alert(1)";
  rejects(javascript, "ARRANGE_LETTERS_UNSAFE_CONTENT");
  const oversized = clone(validContract());
  definition(oversized).targetWord = "B".repeat(ARRANGE_LETTERS_MAX_BYTES);
  rejects(oversized, "ARRANGE_LETTERS_CONFIGURATION_TOO_LARGE");
});

test("Arrange Letters preview returns the complete explicit configuration", () => {
  const preview = arrangeLettersPreviewConfiguration(validateArrangeLettersConfiguration(validContract()));
  assert.deepEqual(preview.arrangeLetters, {
    interactionMode: "CLICK_ORDER",
    targetWord: "BAJU",
    letterUnits: [
      { id: "L1", value: "B", sequence: 1 },
      { id: "L2", value: "A", sequence: 2 },
      { id: "L3", value: "J", sequence: 3 },
      { id: "L4", value: "U", sequence: 4 },
    ],
    showReferenceText: false,
    showTargetSlots: true,
    shuffleLetters: true,
    preserveCase: false,
    allowRetry: true,
    clearOnRetry: false,
    maximumLetters: 20,
  });
});

test("Arrange Letters workflow blocks invalid contracts and marks legacy preview items incomplete", async () => {
  const service = await readFile(new URL("../src/services/digitalActivity.service.ts", import.meta.url), "utf8");
  assert.match(service, /ARRANGE_LETTERS_CONTRACT_INVALID/);
  assert.match(service, /DIGITAL_ACTIVITY_PUBLICATION_INVALID/);
  assert.match(service, /EXPLICIT_ARRANGE_LETTERS_CONTRACT_REQUIRED/);
  assert.match(service, /rendererKey === "arrange-letters"/);
  assert.match(service, /: null;\n\s*return \{/);
});

test("Arrange Letters adds no attempt, assignment, assessment, or AI model", async () => {
  const schema = await readFile(new URL("../prisma/schema.prisma", import.meta.url), "utf8");
  assert.doesNotMatch(schema, /ArrangeLetters(?:Attempt|Submission|Assignment|Mastery|Assessment)/);
});
