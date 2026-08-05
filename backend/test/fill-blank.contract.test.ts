import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  FILL_BLANK_MAX_BYTES,
  FillBlankContractError,
  fillBlankPreviewConfiguration,
  validateFillBlankConfiguration,
  validateFillBlankMedia,
} from "../src/contracts/fill-blank.contract.js";

const safeImageKey = "activity-image/2026/07/11111111-1111-4111-8111-111111111111.png";

function typedSingle(): unknown {
  return {
    fillBlank: {
      mode: "TYPING",
      prompt: "Saya makan {{blank:1}}.",
      blanks: [{
        id: "blank-1",
        marker: "{{blank:1}}",
        required: true,
        inputMode: "TYPING",
        acceptableAnswers: ["nasi"],
        hint: { text: "Makanan ruji.", mediaKey: null },
        placeholder: "Taip jawapan",
        caseSensitive: false,
        trimWhitespace: true,
        collapseWhitespace: true,
        unicodeNormalization: "NFC",
      }],
      wordBank: [],
      allowRepeatedWords: false,
      clearIncorrectOnlyOnRetry: true,
    },
  };
}

function wordBank(): unknown {
  return {
    fillBlank: {
      mode: "WORD_BANK",
      prompt: "Ali membaca {{blank:1}}.",
      blanks: [{
        id: "blank-1",
        marker: "{{blank:1}}",
        required: true,
        inputMode: "WORD_BANK",
        acceptableAnswers: ["buku"],
      }],
      wordBank: [
        { id: "word-1", content: "buku", mediaKey: safeImageKey, singleUse: true },
        { id: "word-2", content: "bola", mediaKey: null, singleUse: true },
      ],
      allowRepeatedWords: false,
    },
  };
}

function mixed(): unknown {
  return {
    fillBlank: {
      mode: "MIXED",
      prompt: "{{blank:1}} pergi ke {{blank:2}}.",
      blanks: [
        { id: "blank-1", marker: "{{blank:1}}", required: true, inputMode: "WORD_BANK", acceptableAnswers: ["Ali"] },
        { id: "blank-2", marker: "{{blank:2}}", required: true, inputMode: "TYPING", acceptableAnswers: ["sekolah"] },
      ],
      wordBank: [{ id: "word-1", content: "Ali", singleUse: true }],
      allowRepeatedWords: false,
    },
  };
}

function clone(value: unknown): Record<string, unknown> {
  return JSON.parse(JSON.stringify(value)) as Record<string, unknown>;
}

function fillBlank(value: Record<string, unknown>): Record<string, unknown> {
  return value.fillBlank as Record<string, unknown>;
}

function blanks(value: Record<string, unknown>): Array<Record<string, unknown>> {
  return fillBlank(value).blanks as Array<Record<string, unknown>>;
}

function bank(value: Record<string, unknown>): Array<Record<string, unknown>> {
  return fillBlank(value).wordBank as Array<Record<string, unknown>>;
}

function rejects(value: unknown, issue: string): void {
  assert.throws(
    () => validateFillBlankConfiguration(value),
    (caught: unknown) => caught instanceof FillBlankContractError && caught.issues.includes(issue as never),
  );
}

test("Fill in the Blank accepts valid single and multiple typed blanks", () => {
  assert.equal(validateFillBlankConfiguration(typedSingle()).fillBlank.mode, "TYPING");
  const multiple = clone(typedSingle());
  fillBlank(multiple).prompt = "Saya makan {{blank:1}} dan minum {{blank:2}}.";
  blanks(multiple).push({ id: "blank-2", marker: "{{blank:2}}", required: true, inputMode: "TYPING", acceptableAnswers: ["air"] });
  const contract = validateFillBlankConfiguration(multiple);
  assert.deepEqual(contract.fillBlank.blanks.map((blank) => blank.marker), ["{{blank:1}}", "{{blank:2}}"]);
});

test("Fill in the Blank accepts valid word-bank and mixed modes", () => {
  assert.equal(validateFillBlankConfiguration(wordBank()).fillBlank.mode, "WORD_BANK");
  assert.equal(validateFillBlankConfiguration(mixed()).fillBlank.mode, "MIXED");
});

test("Fill in the Blank rejects duplicate IDs and markers", () => {
  const duplicateId = clone(mixed());
  blanks(duplicateId)[1]!.id = "blank-1";
  rejects(duplicateId, "FILL_BLANK_BLANK_ID_DUPLICATE");
  const duplicateMarker = clone(mixed());
  blanks(duplicateMarker)[1]!.marker = "{{blank:1}}";
  rejects(duplicateMarker, "FILL_BLANK_MARKER_DUPLICATE");
});

test("Fill in the Blank enforces canonical prompt markers and prompt order", () => {
  const undeclared = clone(typedSingle());
  fillBlank(undeclared).prompt = "Saya makan {{blank:2}}.";
  rejects(undeclared, "FILL_BLANK_MARKER_UNDECLARED");
  const missing = clone(mixed());
  fillBlank(missing).prompt = "{{blank:1}} pergi.";
  rejects(missing, "FILL_BLANK_MARKER_MISSING");
  const incorrectOrder = clone(mixed());
  fillBlank(incorrectOrder).prompt = "{{blank:2}} pergi ke {{blank:1}}.";
  rejects(incorrectOrder, "FILL_BLANK_MARKER_ORDER_INVALID");
  const expression = clone(typedSingle());
  fillBlank(expression).prompt = "{{user.name}}";
  rejects(expression, "FILL_BLANK_TEMPLATE_EXPRESSION_INVALID");
});

test("Fill in the Blank requires unique normalized acceptable answers", () => {
  const missing = clone(typedSingle());
  blanks(missing)[0]!.acceptableAnswers = [];
  rejects(missing, "FILL_BLANK_ACCEPTABLE_ANSWERS_REQUIRED");
  const duplicate = clone(typedSingle());
  blanks(duplicate)[0]!.acceptableAnswers = [" Nasi ", "nasi"];
  rejects(duplicate, "FILL_BLANK_ACCEPTABLE_ANSWER_DUPLICATE");
});

test("Fill in the Blank validates word-bank modes, matching, and repeated-word policy", () => {
  const emptyBank = clone(wordBank());
  fillBlank(emptyBank).wordBank = [];
  rejects(emptyBank, "FILL_BLANK_WORD_BANK_REQUIRED");
  const missingMixedMode = clone(mixed());
  blanks(missingMixedMode)[1]!.inputMode = "WORD_BANK";
  rejects(missingMixedMode, "FILL_BLANK_MODE_INPUT_MISMATCH");
  const unmatched = clone(wordBank());
  bank(unmatched)[0]!.content = "bola";
  bank(unmatched)[1]!.content = "kertas";
  rejects(unmatched, "FILL_BLANK_WORD_BANK_UNSATISFIABLE");
  const repeated = clone(wordBank());
  bank(repeated)[0]!.singleUse = false;
  rejects(repeated, "FILL_BLANK_WORD_BANK_REPEATED_WORD_DISABLED");
});

test("Fill in the Blank validates safe hint text and stored hint media", async () => {
  const configuration = clone(typedSingle());
  blanks(configuration)[0]!.hint = { text: "Petunjuk selamat", mediaKey: safeImageKey };
  const contract = validateFillBlankConfiguration(configuration);
  const checked: string[] = [];
  await validateFillBlankMedia(contract, async (key) => { checked.push(key); });
  assert.deepEqual(checked, [safeImageKey]);
});

test("Fill in the Blank rejects path traversal, scripts, HTML, and oversized JSON", () => {
  const traversal = clone(typedSingle());
  blanks(traversal)[0]!.hint = { mediaKey: "../private.png" };
  rejects(traversal, "FILL_BLANK_MEDIA_KEY_INVALID");
  const script = clone(typedSingle());
  blanks(script)[0]!.hint = { text: "javascript:alert(1)" };
  rejects(script, "FILL_BLANK_UNSAFE_CONTENT");
  const html = clone(typedSingle());
  blanks(html)[0]!.hint = { text: "<img src=x>" };
  rejects(html, "FILL_BLANK_UNSAFE_CONTENT");
  const oversized = clone(typedSingle());
  fillBlank(oversized).prompt = `{{blank:1}}${"a".repeat(FILL_BLANK_MAX_BYTES)}`;
  rejects(oversized, "FILL_BLANK_CONFIGURATION_TOO_LARGE");
});

test("Fill in the Blank preview returns prompt-ordered blanks, word-bank data, hints, and safe media only", () => {
  const configuration = clone(mixed());
  blanks(configuration)[0]!.hint = { text: "Nama murid", mediaKey: safeImageKey };
  bank(configuration)[0]!.mediaKey = safeImageKey;
  const preview = fillBlankPreviewConfiguration(validateFillBlankConfiguration(configuration), new Map([
    [safeImageKey, { url: `/api/media/files/${safeImageKey}`, mimeType: "image/png", altText: "Ali", label: "ali.png" }],
  ]));
  assert.deepEqual(preview.fillBlank.blanks.map((blank) => blank.id), ["blank-1", "blank-2"]);
  assert.equal(preview.fillBlank.wordBank[0]?.content, "Ali");
  assert.equal(preview.fillBlank.blanks[0]?.hint.text, "Nama murid");
  assert.deepEqual(preview.fillBlank.wordBank[0]?.media[0], { key: safeImageKey, url: `/api/media/files/${safeImageKey}`, mimeType: "image/png", altText: "Ali", label: "ali.png" });
  assert.doesNotMatch(JSON.stringify(preview), /\/Users\/|storage\/uploads|private\/tmp/);
  const pathSafePreview = fillBlankPreviewConfiguration(validateFillBlankConfiguration(configuration), new Map([
    [safeImageKey, { url: `/api/media/files/${safeImageKey}`, altText: "/private/tmp/ali.png", label: "/private/tmp/ali.png" }],
  ]));
  assert.equal(pathSafePreview.fillBlank.wordBank[0]?.media[0]?.altText, null);
  assert.equal(pathSafePreview.fillBlank.wordBank[0]?.media[0]?.label, null);
});

test("Fill in the Blank workflow hooks keep legacy items incomplete and leave non-fill preview behavior untouched", async () => {
  const service = await readFile(new URL("../src/services/digitalActivity.service.ts", import.meta.url), "utf8");
  assert.match(service, /FILL_BLANK_CONTRACT_INVALID/);
  assert.match(service, /DIGITAL_ACTIVITY_PUBLICATION_INVALID/);
  assert.match(service, /EXPLICIT_FILL_BLANK_CONTRACT_REQUIRED/);
  assert.match(service, /rendererKey === "fill-blank"/);
  assert.match(service, /: null;\n\s*return \{/);
});

test("Fill in the Blank phase does not introduce Prisma models or assessment workflow domains", async () => {
  const schema = await readFile(new URL("../prisma/schema.prisma", import.meta.url), "utf8");
  assert.doesNotMatch(schema, /FillBlank(?:Attempt|Submission|Assignment|Mastery|Assessment)/);
});
