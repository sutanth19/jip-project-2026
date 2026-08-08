import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  ARRANGE_SYLLABLES_MAX_BYTES,
  ArrangeSyllablesContractError,
  arrangeSyllablesPreviewConfiguration,
  validateArrangeSyllablesConfiguration,
} from "../src/contracts/arrange-syllables.contract.js";

function legacyContract(): unknown {
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

function missingSyllableContract(): unknown {
  return {
    arrangeSyllables: {
      mode: "MISSING_SYLLABLES",
      interactionMode: "DRAG_TO_BLANK",
      words: [
        {
          id: "WORD-1",
          sequence: 1,
          syllables: [
            { id: "SYL-1", value: "CA", sequence: 1, isMissing: false },
            { id: "SYL-2", value: "WAN", sequence: 2, isMissing: true },
          ],
        },
      ],
      distractors: [
        { id: "D1", value: "WAN", sequence: 1 },
        { id: "D2", value: "KI", sequence: 2 },
        { id: "D3", value: "TU", sequence: 3 },
      ],
      hint: "Dengar bunyi akhir perkataan.",
      showReferenceText: false,
      allowRetry: true,
      clearOnRetry: false,
      maximumSyllables: 10,
    },
  };
}

function mediaContract(overrides: Record<string, unknown> = {}): unknown {
  return {
    arrangeSyllables: {
      mode: "MISSING_SYLLABLES",
      interactionMode: "DRAG_TO_BLANK",
      words: [
        {
          id: "WORD-1",
          sequence: 1,
          syllables: [
            { id: "SYL-1", value: "CA", sequence: 1, isMissing: false },
            { id: "SYL-2", value: "WAN", sequence: 2, isMissing: true },
          ],
        },
      ],
      distractors: [
        { id: "D1", value: "WAN", sequence: 1 },
        { id: "D2", value: "KI", sequence: 2 },
      ],
      hint: "Dengar bunyi akhir perkataan.",
      media: {
        image: null,
        audio: null,
        ...overrides,
      },
      showReferenceText: false,
      allowRetry: true,
      clearOnRetry: false,
      maximumSyllables: 10,
    },
  };
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function definition(value: Record<string, unknown>): Record<string, unknown> {
  return value.arrangeSyllables as Record<string, unknown>;
}

function syllables(value: Record<string, unknown>): Array<Record<string, unknown>> {
  return definition(value).syllables as Array<Record<string, unknown>>;
}

function words(value: Record<string, unknown>): Array<Record<string, unknown>> {
  return definition(value).words as Array<Record<string, unknown>>;
}

function distractors(value: Record<string, unknown>): Array<Record<string, unknown>> {
  return definition(value).distractors as Array<Record<string, unknown>>;
}

function rejects(value: unknown, issue: string): void {
  assert.throws(
    () => validateArrangeSyllablesConfiguration(value),
    (caught: unknown) => caught instanceof ArrangeSyllablesContractError && caught.issues.includes(issue as never),
  );
}

test("Arrange Syllables accepts the legacy ordered reconstruction contract", () => {
  const contract = validateArrangeSyllablesConfiguration(legacyContract());
  assert.equal(contract.arrangeSyllables.mode, "ORDERED_RECONSTRUCTION");
  assert.equal(contract.arrangeSyllables.targetWord, "SEKOLAH");
  assert.equal(contract.arrangeSyllables.maximumSyllables, 10);
});

test("Arrange Syllables accepts the missing-syllable authoring contract", () => {
  const contract = validateArrangeSyllablesConfiguration(missingSyllableContract());
  assert.equal(contract.arrangeSyllables.mode, "MISSING_SYLLABLES");
  assert.equal(contract.arrangeSyllables.words.length, 1);
  assert.equal(contract.arrangeSyllables.words[0]?.syllables[1]?.isMissing, true);
  assert.equal(contract.arrangeSyllables.distractors[0]?.value, "WAN");
});

test("Arrange Syllables accepts persisted image and audio media URLs in the missing-syllable contract", () => {
  const imageUrl = "https://res.cloudinary.com/demo/image/upload/v1/login_img.png";
  const audioUrl = "https://res.cloudinary.com/demo/video/upload/v1/audio.mp3";

  const imageOnly = validateArrangeSyllablesConfiguration(mediaContract({ image: { mediaKey: "activity-image/login_img.png", url: imageUrl, mimeType: "image/png", originalName: "login_img.png", mediaRole: "PRIMARY_IMAGE", altText: null } }));
  const audioOnly = validateArrangeSyllablesConfiguration(mediaContract({ audio: { mediaKey: "activity-audio/reading.mp3", url: audioUrl, mimeType: "audio/mpeg", originalName: "reading.mp3", mediaRole: "REFERENCE_AUDIO", altText: null } }));
  const both = validateArrangeSyllablesConfiguration(mediaContract({
    image: { mediaKey: "activity-image/login_img.png", url: imageUrl, mimeType: "image/png", originalName: "login_img.png", mediaRole: "PRIMARY_IMAGE", altText: null },
    audio: { mediaKey: "activity-audio/reading.mp3", url: audioUrl, mimeType: "audio/mpeg", originalName: "reading.mp3", mediaRole: "REFERENCE_AUDIO", altText: null },
  }));

  assert.equal(imageOnly.arrangeSyllables.media?.image?.url, imageUrl);
  assert.equal(imageOnly.arrangeSyllables.media?.audio, null);
  assert.equal(audioOnly.arrangeSyllables.media?.audio?.url, audioUrl);
  assert.equal(audioOnly.arrangeSyllables.media?.image, null);
  assert.equal(both.arrangeSyllables.media?.image?.url, imageUrl);
  assert.equal(both.arrangeSyllables.media?.audio?.url, audioUrl);
});

test("Arrange Syllables rejects unsupported media properties and unsafe fallback content", () => {
  const unsupported = clone(mediaContract()) as Record<string, unknown>;
  (definition(unsupported).media as Record<string, unknown>).video = { mediaKey: "x", url: "/media/video", mediaRole: "PRIMARY_IMAGE" };
  rejects(unsupported, "ARRANGE_SYLLABLES_UNSUPPORTED_FIELD");

  const unsafe = clone(mediaContract()) as Record<string, unknown>;
  (definition(unsafe).media as Record<string, unknown>).image = { mediaKey: "activity-image/login_img.png", url: "javascript:alert(1)", mimeType: "image/png", originalName: "login_img.png", mediaRole: "PRIMARY_IMAGE", altText: null };
  rejects(unsafe, "ARRANGE_SYLLABLES_UNSAFE_CONTENT");
});

test("Arrange Syllables permits repeated legacy syllable values with unique IDs", () => {
  const repeated = clone(legacyContract()) as Record<string, unknown>;
  definition(repeated).targetWord = "MAMAMA";
  definition(repeated).syllables = [
    { id: "MA-1", value: "MA", sequence: 1 },
    { id: "MA-2", value: "MA", sequence: 2 },
    { id: "MA-3", value: "MA", sequence: 3 },
  ];
  const contract = validateArrangeSyllablesConfiguration(repeated);
  if (contract.arrangeSyllables.mode !== "ORDERED_RECONSTRUCTION") throw new Error("Expected legacy mode");
  assert.deepEqual(contract.arrangeSyllables.syllables.map((syllable) => syllable.id), ["MA-1", "MA-2", "MA-3"]);
});

test("Arrange Syllables validates duplicate and reconstruction rules for the legacy contract", () => {
  const duplicateId = clone(legacyContract()) as Record<string, unknown>;
  syllables(duplicateId)[1]!.id = "S1";
  rejects(duplicateId, "ARRANGE_SYLLABLE_ID_DUPLICATE");
  const duplicateSequence = clone(legacyContract()) as Record<string, unknown>;
  syllables(duplicateSequence)[1]!.sequence = 1;
  rejects(duplicateSequence, "ARRANGE_SYLLABLE_SEQUENCE_DUPLICATE");
  const nonContiguous = clone(legacyContract()) as Record<string, unknown>;
  syllables(nonContiguous)[2]!.sequence = 4;
  rejects(nonContiguous, "ARRANGE_SYLLABLE_SEQUENCE_ORDER_INVALID");
  const reconstruction = clone(legacyContract()) as Record<string, unknown>;
  syllables(reconstruction)[2]!.value = "HLA";
  rejects(reconstruction, "ARRANGE_SYLLABLE_RECONSTRUCTION_INVALID");
});

test("Arrange Syllables validates missing blanks, distractors, and answer mapping for the new contract", () => {
  const noMissing = clone(missingSyllableContract()) as Record<string, unknown>;
  ((words(noMissing)[0]!.syllables as Array<Record<string, unknown>>)[1]!).isMissing = false;
  rejects(noMissing, "ARRANGE_SYLLABLES_MISSING_REQUIRED");

  const noCorrectDistractor = clone(missingSyllableContract()) as Record<string, unknown>;
  distractors(noCorrectDistractor)[0]!.value = "SALAH";
  rejects(noCorrectDistractor, "ARRANGE_SYLLABLES_ANSWER_MAPPING_INVALID");

  const duplicateWordSequence = clone(missingSyllableContract()) as Record<string, unknown>;
  definition(duplicateWordSequence).words = [
    ...words(duplicateWordSequence),
    {
      id: "WORD-2",
      sequence: 1,
      syllables: [{ id: "SYL-3", value: "LA", sequence: 1, isMissing: true }],
    },
  ];
  rejects(duplicateWordSequence, "ARRANGE_SYLLABLES_WORD_SEQUENCE_DUPLICATE");
});

test("Arrange Syllables rejects oversized, HTML, JavaScript, URL, and template content", () => {
  const oversized = clone(legacyContract()) as Record<string, unknown>;
  definition(oversized).targetWord = "S".repeat(ARRANGE_SYLLABLES_MAX_BYTES);
  rejects(oversized, "ARRANGE_SYLLABLES_CONFIGURATION_TOO_LARGE");
  const html = clone(legacyContract()) as Record<string, unknown>;
  syllables(html)[0]!.value = "<b>SE</b>";
  rejects(html, "ARRANGE_SYLLABLES_UNSAFE_CONTENT");
  const javascript = clone(legacyContract()) as Record<string, unknown>;
  definition(javascript).targetWord = "javascript:alert(1)";
  rejects(javascript, "ARRANGE_SYLLABLES_UNSAFE_CONTENT");
  const url = clone(missingSyllableContract()) as Record<string, unknown>;
  distractors(url)[0]!.value = "https://example.test";
  rejects(url, "ARRANGE_SYLLABLES_UNSAFE_CONTENT");
  const template = clone(legacyContract()) as Record<string, unknown>;
  definition(template).targetWord = "{{word}}";
  rejects(template, "ARRANGE_SYLLABLES_TARGET_WORD_REQUIRED");
});

test("Arrange Syllables preview returns the full explicit configuration for both modes", () => {
  const legacyPreview = arrangeSyllablesPreviewConfiguration(validateArrangeSyllablesConfiguration(legacyContract()));
  assert.equal(legacyPreview.arrangeSyllables.mode, "ORDERED_RECONSTRUCTION");
  const missingPreview = arrangeSyllablesPreviewConfiguration(validateArrangeSyllablesConfiguration(missingSyllableContract()));
  assert.equal(missingPreview.arrangeSyllables.mode, "MISSING_SYLLABLES");
  if (missingPreview.arrangeSyllables.mode !== "MISSING_SYLLABLES") throw new Error("Expected missing mode");
  assert.deepEqual(missingPreview.arrangeSyllables.words[0], {
    id: "WORD-1",
    sequence: 1,
    syllables: [
      { id: "SYL-1", value: "CA", sequence: 1, isMissing: false },
      { id: "SYL-2", value: "WAN", sequence: 2, isMissing: true },
    ],
  });

  const mediaPreview = arrangeSyllablesPreviewConfiguration(validateArrangeSyllablesConfiguration(mediaContract({
    image: { mediaKey: "activity/image.png", url: "https://cdn.example.test/image.png", mimeType: "image/png", originalName: "image.png", mediaRole: "PRIMARY_IMAGE", altText: "Contoh imej" },
    audio: { mediaKey: "activity/audio.mp3", url: "https://cdn.example.test/audio.mp3", mimeType: "audio/mpeg", originalName: "audio.mp3", mediaRole: "REFERENCE_AUDIO", altText: null },
  })));
  if (mediaPreview.arrangeSyllables.mode !== "MISSING_SYLLABLES") throw new Error("Expected missing mode");
  assert.equal(mediaPreview.arrangeSyllables.media?.image?.url, "https://cdn.example.test/image.png");
  assert.equal(mediaPreview.arrangeSyllables.media?.audio?.url, "https://cdn.example.test/audio.mp3");
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
