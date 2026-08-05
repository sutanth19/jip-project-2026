import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { READING_MAX_BYTES, ReadingContractError, readingPreviewConfiguration, validateReadingConfiguration, validateReadingMedia } from "../src/contracts/reading.contract.js";

const imageKey = "activity-image/2026/07/00000000-0000-4000-8000-000000000101.png";
const audioKey = "activity-audio/2026/07/00000000-0000-4000-8000-000000000102.mp3";

function validContract(): unknown {
  return {
    reading: {
      contentMode: "PARAGRAPH",
      title: "Mari Membaca",
      readingText: "Ali memakai baju baharu.",
      paragraphs: [{ id: "P1", sequence: 1, text: "Ali memakai baju baharu." }],
      readingDirection: "LEFT_TO_RIGHT",
      display: { fontSize: 32, lineHeight: 1.8, textAlignment: "LEFT", showParagraphNumbers: false, showSyllableBreaks: false, syllableSeparator: " · ", allowZoom: true },
      readingTools: { showPlayAudio: true, showReplay: true, showPause: true, showReadingTimer: false, allowTextZoom: true },
      completion: { requireOpenActivity: true, minimumViewingSeconds: 10 },
      allowRetry: true,
      hint: { type: "NONE" },
    },
  };
}
function clone(value: unknown): Record<string, unknown> { return JSON.parse(JSON.stringify(value)) as Record<string, unknown>; }
function definition(value: Record<string, unknown>): Record<string, unknown> { return value.reading as Record<string, unknown>; }
function rejects(value: unknown, issue: string): void { assert.throws(() => validateReadingConfiguration(value), (caught: unknown) => caught instanceof ReadingContractError && caught.issues.includes(issue as never)); }

test("Reading accepts all explicit content modes and normalizes NFC text", () => {
  for (const mode of ["LETTER", "SYLLABLE", "WORD", "PHRASE", "SENTENCE", "PARAGRAPH"] as const) {
    const contract = clone(validContract());
    definition(contract).contentMode = mode;
    definition(contract).readingText = mode === "LETTER" ? "A\u0301" : mode === "SYLLABLE" ? "ba" : mode === "WORD" ? "baju" : mode === "PHRASE" ? "baju biru" : mode === "SENTENCE" ? "Ali membaca buku." : "Ali membaca buku di sekolah.";
    const parsed = validateReadingConfiguration(contract);
    assert.equal(parsed.reading.contentMode, mode);
    if (mode === "LETTER") assert.equal(parsed.reading.readingText, "Á");
  }
});

test("Reading validates explicit paragraphs, display, tools, completion, and direction", () => {
  const duplicateId = clone(validContract());
  definition(duplicateId).paragraphs = [{ id: "P1", sequence: 1, text: "Ali." }, { id: "P1", sequence: 2, text: "Baju." }];
  rejects(duplicateId, "READING_PARAGRAPH_INVALID");
  const sequence = clone(validContract());
  definition(sequence).paragraphs = [{ id: "P1", sequence: 2, text: "Ali." }];
  rejects(sequence, "READING_PARAGRAPH_INVALID");
  const display = clone(validContract());
  (definition(display).display as Record<string, unknown>).textAlignment = "RIGHT";
  rejects(display, "READING_DISPLAY_INVALID");
  const tools = clone(validContract());
  delete (definition(tools).readingTools as Record<string, unknown>).showPause;
  rejects(tools, "READING_TOOL_CONFIG_INVALID");
  const completion = clone(validContract());
  (definition(completion).completion as Record<string, unknown>).minimumViewingSeconds = -1;
  rejects(completion, "READING_COMPLETION_INVALID");
  const direction = clone(validContract());
  definition(direction).readingDirection = "RIGHT_TO_LEFT";
  rejects(direction, "READING_DIRECTION_INVALID");
});

test("Reading requires explicit syllables and validates hint media", async () => {
  const syllables = clone(validContract());
  definition(syllables).contentMode = "WORD";
  definition(syllables).readingText = "sekolah";
  (definition(syllables).display as Record<string, unknown>).showSyllableBreaks = true;
  definition(syllables).syllableUnits = [{ id: "S1", value: "se", sequence: 1 }, { id: "S2", value: "ko", sequence: 2 }, { id: "S3", value: "lah", sequence: 3 }];
  assert.deepEqual(validateReadingConfiguration(syllables).reading.syllableUnits.map((unit) => unit.value), ["se", "ko", "lah"]);
  const missing = clone(validContract());
  (definition(missing).display as Record<string, unknown>).showSyllableBreaks = true;
  rejects(missing, "READING_SYLLABLE_UNITS_INVALID");
  const audio = clone(validContract());
  definition(audio).hint = { type: "PLAY_AUDIO" };
  rejects(audio, "READING_HINT_INVALID");
  definition(audio).media = { audioKey };
  await validateReadingMedia(validateReadingConfiguration(audio), async (key) => assert.equal(key, audioKey));
});

test("Reading rejects unsafe, oversized, deeply nested, and polluted configuration", () => {
  const html = clone(validContract()); definition(html).readingText = "<b>Ali</b>"; rejects(html, "READING_UNSAFE_CONTENT");
  const javascript = clone(validContract()); definition(javascript).readingText = "javascript:alert(1)"; rejects(javascript, "READING_UNSAFE_CONTENT");
  const url = clone(validContract()); definition(url).readingText = "https://example.test"; rejects(url, "READING_UNSAFE_CONTENT");
  const template = clone(validContract()); definition(template).readingText = "{{readingText}}"; rejects(template, "READING_TEXT_REQUIRED");
  const oversized = clone(validContract()); definition(oversized).readingText = "a".repeat(READING_MAX_BYTES); rejects(oversized, "READING_CONFIGURATION_TOO_LARGE");
  const deep = JSON.parse('{"reading":{"contentMode":"WORD","readingText":"baju","paragraphs":[{"id":"P1","sequence":1,"text":"baju"}],"readingDirection":"LEFT_TO_RIGHT","display":{"fontSize":32,"lineHeight":1.8,"textAlignment":"LEFT","showParagraphNumbers":false,"showSyllableBreaks":false,"syllableSeparator":" · ","allowZoom":true},"readingTools":{"showPlayAudio":true,"showReplay":true,"showPause":true,"showReadingTimer":false,"allowTextZoom":true},"completion":{"requireOpenActivity":true,"minimumViewingSeconds":0},"nested":{"a":{"b":{"c":{"d":{"e":{"f":{"g":1}}}}}}}}}') as unknown;
  rejects(deep, "READING_CONFIGURATION_TOO_DEEP");
  rejects(JSON.parse('{"reading":{"__proto__":{},"contentMode":"WORD"}}') as unknown, "READING_UNSAFE_CONTENT");
});

test("Reading preview returns ordered safe guided-reading data without paths", () => {
  const contract = clone(validContract());
  definition(contract).hint = { type: "PLAY_AUDIO" };
  definition(contract).media = { imageKey, audioKey, instructionAudioKey: audioKey };
  definition(contract).paragraphs = [{ id: "P2", sequence: 2, text: "Dua." }, { id: "P1", sequence: 1, text: "Satu." }];
  const preview = readingPreviewConfiguration(validateReadingConfiguration(contract), new Map([[imageKey, { url: "/media/image", mimeType: "image/png", altText: "Baju", label: "/private/tmp/hidden.png" }], [audioKey, { url: "/media/audio", mimeType: "audio/mpeg", altText: "Baca", label: "/private/tmp/hidden.mp3" }]]));
  assert.deepEqual(preview.reading.paragraphs.map((paragraph) => paragraph.id), ["P1", "P2"]);
  assert.deepEqual(preview.reading.hint, { type: "PLAY_AUDIO", media: [{ key: audioKey, url: "/media/audio", mimeType: "audio/mpeg", altText: "Baca", label: null }] });
  assert.equal(preview.reading.media.image[0]?.label, null);
  assert.equal(JSON.stringify(preview), JSON.stringify(preview).replaceAll("/private/tmp", ""));
});

test("Reading workflow blocks malformed and legacy contracts while preserving other previews", async () => {
  const service = await readFile(new URL("../src/services/digitalActivity.service.ts", import.meta.url), "utf8");
  assert.match(service, /READING_CONTRACT_INVALID/);
  assert.match(service, /DIGITAL_ACTIVITY_PUBLICATION_INVALID/);
  assert.match(service, /EXPLICIT_READING_CONTRACT_REQUIRED/);
  assert.match(service, /rendererKey === "reading"/);
  assert.match(service, /legacyReading/);
  assert.match(service, /reading\?\.configuration \?\? freeHandwriting\?\.configuration \?\? readingComprehension\?\.configuration \?\? voiceRecording\?\.configuration \?\? item\.configuration/);
});

test("Reading adds no assignment, attempt, submission, assessment, AI, or speech model", async () => {
  const schema = await readFile(new URL("../prisma/schema.prisma", import.meta.url), "utf8");
  assert.doesNotMatch(schema, /Reading(?:Attempt|Submission|Assignment|Mastery|Assessment|AI|Speech)/);
});
