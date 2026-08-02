import { assertSafeStorageKey } from "../storage/local-storage.adapter.js";
import { jsonByteSize } from "../utils/safe-json-schema.js";

export const READING_MAX_BYTES = 16 * 1024;
export const READING_MAX_DEPTH = 8;
export const READING_MAX_PARAGRAPHS = 100;

const UNSAFE_TEXT = /(?:<\s*\/?\s*[a-z][^>]*>|\b(?:javascript|vbscript|data)\s*:|\bfunction\b|\beval\s*\(|\bscript\b|\bon[a-z]+\s*=|\b[a-z][a-z0-9+.-]*:\/\/)/i;
const FORBIDDEN_OBJECT_KEYS = new Set(["__proto__", "prototype", "constructor"]);
const segmenter = new Intl.Segmenter("ms-MY", { granularity: "grapheme" });

export type ReadingContentMode = "LETTER" | "SYLLABLE" | "WORD" | "PHRASE" | "SENTENCE" | "PARAGRAPH";
export type ReadingTextAlignment = "LEFT" | "CENTER" | "JUSTIFY";
export type ReadingHintType = "NONE" | "PLAY_AUDIO" | "HIGHLIGHT_TEXT" | "SHOW_FIRST_PARAGRAPH";

export type ReadingIssueCode =
  | "READING_CONTRACT_REQUIRED"
  | "READING_CONFIGURATION_INVALID"
  | "READING_CONFIGURATION_TOO_LARGE"
  | "READING_CONFIGURATION_TOO_DEEP"
  | "READING_UNSAFE_CONTENT"
  | "READING_UNSUPPORTED_FIELD"
  | "READING_CONTENT_MODE_INVALID"
  | "READING_TEXT_REQUIRED"
  | "READING_TEXT_TOO_LONG"
  | "READING_PARAGRAPH_INVALID"
  | "READING_DISPLAY_INVALID"
  | "READING_DIRECTION_INVALID"
  | "READING_TOOL_CONFIG_INVALID"
  | "READING_COMPLETION_INVALID"
  | "READING_HINT_INVALID"
  | "READING_MEDIA_INVALID"
  | "READING_SYLLABLE_UNITS_INVALID";

export class ReadingContractError extends Error {
  constructor(readonly issues: readonly ReadingIssueCode[]) {
    super("Kontrak Reading tidak sah.");
    this.name = "ReadingContractError";
  }
}

export interface ReadingParagraph { id: string; sequence: number; text: string; }
export interface ReadingSyllableUnit { id: string; value: string; sequence: number; }
export interface ReadingDisplay { fontSize: number; lineHeight: number; textAlignment: ReadingTextAlignment; showParagraphNumbers: boolean; showSyllableBreaks: boolean; syllableSeparator: string; allowZoom: boolean; }
export interface ReadingTools { showPlayAudio: boolean; showReplay: boolean; showPause: boolean; showReadingTimer: boolean; allowTextZoom: boolean; }
export interface ReadingCompletion { requireOpenActivity: boolean; minimumViewingSeconds: number; }
export interface ReadingMedia { imageKey: string | null; audioKey: string | null; instructionAudioKey: string | null; }
export interface ReadingHint { type: ReadingHintType; }
export interface ReadingDefinition {
  contentMode: ReadingContentMode;
  title: string | null;
  readingText: string;
  paragraphs: ReadingParagraph[];
  readingDirection: "LEFT_TO_RIGHT";
  display: ReadingDisplay;
  syllableUnits: ReadingSyllableUnit[];
  readingTools: ReadingTools;
  completion: ReadingCompletion;
  allowRetry: boolean;
  hint: ReadingHint;
  media: ReadingMedia;
}
export interface ReadingConfiguration { reading: ReadingDefinition; }
export interface ReadingPreviewMedia { key: string; url: string | null; mimeType: string | null; altText: string | null; label: string | null; }
export interface ReadingPreviewMediaDescriptor { url: string | null; mimeType?: string | null; altText?: string | null; label?: string | null; }

function fail(...issues: ReadingIssueCode[]): never { throw new ReadingContractError(issues); }
function asRecord(value: unknown, issue: ReadingIssueCode = "READING_CONTRACT_REQUIRED"): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) fail(issue);
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) fail(issue);
  return value as Record<string, unknown>;
}
function assertSafeJson(value: unknown, depth = 0, seen = new WeakSet<object>()): void {
  if (depth > READING_MAX_DEPTH) fail("READING_CONFIGURATION_TOO_DEEP");
  if (value === null || typeof value === "boolean") return;
  if (typeof value === "number") { if (!Number.isFinite(value)) fail("READING_CONFIGURATION_INVALID"); return; }
  if (typeof value === "string") { if (UNSAFE_TEXT.test(value)) fail("READING_UNSAFE_CONTENT"); return; }
  if (!value || typeof value !== "object" || value instanceof Date || Buffer.isBuffer(value) || seen.has(value)) fail("READING_CONFIGURATION_INVALID");
  seen.add(value);
  if (Array.isArray(value)) { for (const entry of value) assertSafeJson(entry, depth + 1, seen); return; }
  const record = asRecord(value, "READING_CONFIGURATION_INVALID");
  for (const [key, entry] of Object.entries(record)) {
    if (FORBIDDEN_OBJECT_KEYS.has(key) || UNSAFE_TEXT.test(key)) fail("READING_UNSAFE_CONTENT");
    assertSafeJson(entry, depth + 1, seen);
  }
}
function assertAllowedKeys(value: Record<string, unknown>, allowed: readonly string[]): void { for (const key of Object.keys(value)) if (!allowed.includes(key)) fail("READING_UNSUPPORTED_FIELD"); }
function requiredBoolean(value: unknown, issue: ReadingIssueCode): boolean { if (typeof value !== "boolean") fail(issue); return value; }
function optionalBoolean(value: unknown, fallback: boolean, issue: ReadingIssueCode): boolean { return value === undefined ? fallback : requiredBoolean(value, issue); }
function safeString(value: unknown, issue: ReadingIssueCode, maximum: number): string {
  if (typeof value !== "string") fail(issue);
  const result = value.trim().normalize("NFC");
  if (!result || result.length > maximum || UNSAFE_TEXT.test(result) || result.includes("{{") || result.includes("}}")) fail(issue);
  return result;
}
function safeDisplayString(value: unknown, issue: ReadingIssueCode, maximum: number, fallback: string): string {
  if (value === undefined) return fallback;
  if (typeof value !== "string") fail(issue);
  const result = value.normalize("NFC");
  if (!result.trim() || result.length > maximum || UNSAFE_TEXT.test(result) || result.includes("{{") || result.includes("}}")) fail(issue);
  return result;
}
function parseText(value: unknown, mode: ReadingContentMode): string {
  const limits: Record<ReadingContentMode, number> = { LETTER: 8, SYLLABLE: 20, WORD: 50, PHRASE: 150, SENTENCE: 300, PARAGRAPH: 5_000 };
  const text = safeString(value, "READING_TEXT_REQUIRED", 5_000);
  const length = mode === "LETTER" ? [...segmenter.segment(text)].length : [...text].length;
  if (length > limits[mode]) fail("READING_TEXT_TOO_LONG");
  if ((mode === "LETTER" || mode === "SYLLABLE" || mode === "WORD") && /\s/u.test(text)) fail("READING_TEXT_REQUIRED");
  return text;
}
function parseParagraphs(value: unknown): ReadingParagraph[] {
  if (!Array.isArray(value) || value.length === 0 || value.length > READING_MAX_PARAGRAPHS) fail("READING_PARAGRAPH_INVALID");
  const paragraphs = value.map((entry): ReadingParagraph => {
    const paragraph = asRecord(entry, "READING_PARAGRAPH_INVALID");
    assertAllowedKeys(paragraph, ["id", "sequence", "text"]);
    if (typeof paragraph.sequence !== "number" || !Number.isInteger(paragraph.sequence) || paragraph.sequence < 1 || paragraph.sequence > READING_MAX_PARAGRAPHS) fail("READING_PARAGRAPH_INVALID");
    return { id: safeString(paragraph.id, "READING_PARAGRAPH_INVALID", 100), sequence: paragraph.sequence, text: safeString(paragraph.text, "READING_PARAGRAPH_INVALID", 5_000) };
  });
  if (new Set(paragraphs.map((paragraph) => paragraph.id)).size !== paragraphs.length || new Set(paragraphs.map((paragraph) => paragraph.sequence)).size !== paragraphs.length) fail("READING_PARAGRAPH_INVALID");
  const ordered = [...paragraphs].sort((left, right) => left.sequence - right.sequence);
  if (ordered.some((paragraph, index) => paragraph.sequence !== index + 1)) fail("READING_PARAGRAPH_INVALID");
  return ordered;
}
function parseDisplay(value: unknown): ReadingDisplay {
  const display = asRecord(value, "READING_DISPLAY_INVALID");
  assertAllowedKeys(display, ["fontSize", "lineHeight", "textAlignment", "showParagraphNumbers", "showSyllableBreaks", "syllableSeparator", "allowZoom"]);
  if (typeof display.fontSize !== "number" || !Number.isInteger(display.fontSize) || display.fontSize < 16 || display.fontSize > 96) fail("READING_DISPLAY_INVALID");
  if (typeof display.lineHeight !== "number" || !Number.isFinite(display.lineHeight) || display.lineHeight < 1 || display.lineHeight > 3) fail("READING_DISPLAY_INVALID");
  if (display.textAlignment !== "LEFT" && display.textAlignment !== "CENTER" && display.textAlignment !== "JUSTIFY") fail("READING_DISPLAY_INVALID");
  return { fontSize: display.fontSize, lineHeight: display.lineHeight, textAlignment: display.textAlignment, showParagraphNumbers: requiredBoolean(display.showParagraphNumbers, "READING_DISPLAY_INVALID"), showSyllableBreaks: requiredBoolean(display.showSyllableBreaks, "READING_DISPLAY_INVALID"), syllableSeparator: safeDisplayString(display.syllableSeparator, "READING_DISPLAY_INVALID", 20, " · "), allowZoom: requiredBoolean(display.allowZoom, "READING_DISPLAY_INVALID") };
}
function parseSyllableUnits(value: unknown, readingText: string, showSyllableBreaks: boolean): ReadingSyllableUnit[] {
  if (!showSyllableBreaks) { if (value !== undefined && value !== null) fail("READING_SYLLABLE_UNITS_INVALID"); return []; }
  if (!Array.isArray(value) || value.length === 0 || value.length > 100) fail("READING_SYLLABLE_UNITS_INVALID");
  const units = value.map((entry): ReadingSyllableUnit => {
    const unit = asRecord(entry, "READING_SYLLABLE_UNITS_INVALID");
    assertAllowedKeys(unit, ["id", "value", "sequence"]);
    if (typeof unit.sequence !== "number" || !Number.isInteger(unit.sequence) || unit.sequence < 1 || unit.sequence > 100) fail("READING_SYLLABLE_UNITS_INVALID");
    return { id: safeString(unit.id, "READING_SYLLABLE_UNITS_INVALID", 100), value: safeString(unit.value, "READING_SYLLABLE_UNITS_INVALID", 100), sequence: unit.sequence };
  });
  if (new Set(units.map((unit) => unit.id)).size !== units.length || new Set(units.map((unit) => unit.sequence)).size !== units.length) fail("READING_SYLLABLE_UNITS_INVALID");
  const ordered = [...units].sort((left, right) => left.sequence - right.sequence);
  if (ordered.some((unit, index) => unit.sequence !== index + 1) || ordered.map((unit) => unit.value).join("").normalize("NFC") !== readingText) fail("READING_SYLLABLE_UNITS_INVALID");
  return ordered;
}
function parseTools(value: unknown): ReadingTools {
  const tools = asRecord(value, "READING_TOOL_CONFIG_INVALID");
  assertAllowedKeys(tools, ["showPlayAudio", "showReplay", "showPause", "showReadingTimer", "allowTextZoom"]);
  return { showPlayAudio: requiredBoolean(tools.showPlayAudio, "READING_TOOL_CONFIG_INVALID"), showReplay: requiredBoolean(tools.showReplay, "READING_TOOL_CONFIG_INVALID"), showPause: requiredBoolean(tools.showPause, "READING_TOOL_CONFIG_INVALID"), showReadingTimer: requiredBoolean(tools.showReadingTimer, "READING_TOOL_CONFIG_INVALID"), allowTextZoom: requiredBoolean(tools.allowTextZoom, "READING_TOOL_CONFIG_INVALID") };
}
function parseCompletion(value: unknown): ReadingCompletion {
  const completion = asRecord(value, "READING_COMPLETION_INVALID");
  assertAllowedKeys(completion, ["requireOpenActivity", "minimumViewingSeconds"]);
  if (typeof completion.minimumViewingSeconds !== "number" || !Number.isInteger(completion.minimumViewingSeconds) || completion.minimumViewingSeconds < 0 || completion.minimumViewingSeconds > 3_600) fail("READING_COMPLETION_INVALID");
  return { requireOpenActivity: requiredBoolean(completion.requireOpenActivity, "READING_COMPLETION_INVALID"), minimumViewingSeconds: completion.minimumViewingSeconds };
}
function mediaKey(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string" || value !== value.trim() || !value || value.length > 512 || UNSAFE_TEXT.test(value)) fail("READING_MEDIA_INVALID");
  try { assertSafeStorageKey(value); } catch { fail("READING_MEDIA_INVALID"); }
  return value;
}
function parseMedia(value: unknown): ReadingMedia {
  if (value === undefined || value === null) return { imageKey: null, audioKey: null, instructionAudioKey: null };
  const media = asRecord(value, "READING_MEDIA_INVALID");
  assertAllowedKeys(media, ["imageKey", "audioKey", "instructionAudioKey"]);
  return { imageKey: mediaKey(media.imageKey), audioKey: mediaKey(media.audioKey), instructionAudioKey: mediaKey(media.instructionAudioKey) };
}
function parseHint(value: unknown, media: ReadingMedia): ReadingHint {
  if (value === undefined || value === null) return { type: "NONE" };
  const hint = asRecord(value, "READING_HINT_INVALID");
  assertAllowedKeys(hint, ["type"]);
  if (hint.type !== "NONE" && hint.type !== "PLAY_AUDIO" && hint.type !== "HIGHLIGHT_TEXT" && hint.type !== "SHOW_FIRST_PARAGRAPH") fail("READING_HINT_INVALID");
  if (hint.type === "PLAY_AUDIO" && !media.audioKey) fail("READING_HINT_INVALID");
  return { type: hint.type };
}

export function validateReadingConfiguration(value: unknown): ReadingConfiguration {
  if (jsonByteSize(value) > READING_MAX_BYTES) fail("READING_CONFIGURATION_TOO_LARGE");
  assertSafeJson(value);
  const configuration = asRecord(value);
  assertAllowedKeys(configuration, ["reading"]);
  const definition = asRecord(configuration.reading);
  assertAllowedKeys(definition, ["contentMode", "title", "readingText", "paragraphs", "readingDirection", "display", "syllableUnits", "readingTools", "completion", "allowRetry", "hint", "media"]);
  const contentMode = definition.contentMode;
  if (contentMode !== "LETTER" && contentMode !== "SYLLABLE" && contentMode !== "WORD" && contentMode !== "PHRASE" && contentMode !== "SENTENCE" && contentMode !== "PARAGRAPH") fail("READING_CONTENT_MODE_INVALID");
  const title = definition.title === undefined || definition.title === null ? null : safeString(definition.title, "READING_TEXT_REQUIRED", 200);
  const readingText = parseText(definition.readingText, contentMode);
  const paragraphs = parseParagraphs(definition.paragraphs);
  if (definition.readingDirection !== "LEFT_TO_RIGHT") fail("READING_DIRECTION_INVALID");
  const display = parseDisplay(definition.display);
  const syllableUnits = parseSyllableUnits(definition.syllableUnits, readingText, display.showSyllableBreaks);
  const readingTools = parseTools(definition.readingTools);
  const completion = parseCompletion(definition.completion);
  const media = parseMedia(definition.media);
  const hint = parseHint(definition.hint, media);
  return { reading: { contentMode, title, readingText, paragraphs, readingDirection: "LEFT_TO_RIGHT", display, syllableUnits, readingTools, completion, allowRetry: optionalBoolean(definition.allowRetry, true, "READING_CONFIGURATION_INVALID"), hint, media } };
}

export async function validateReadingMedia(configuration: ReadingConfiguration, assertMediaExists: (key: string) => Promise<void>): Promise<void> {
  for (const key of readingMediaKeys(configuration)) {
    try { await assertMediaExists(key); } catch { fail("READING_MEDIA_INVALID"); }
  }
}
export function readingMediaKeys(configuration: ReadingConfiguration): string[] { return [configuration.reading.media.imageKey, configuration.reading.media.audioKey, configuration.reading.media.instructionAudioKey].filter((key): key is string => key !== null); }
function previewMedia(key: string | null, media: ReadonlyMap<string, ReadingPreviewMediaDescriptor>): ReadingPreviewMedia[] {
  if (!key) return [];
  const descriptor = media.get(key);
  return [{ key, url: descriptor?.url ?? null, mimeType: descriptor?.mimeType ?? null, altText: safePreviewMediaText(descriptor?.altText), label: safePreviewMediaText(descriptor?.label) }];
}
function safePreviewMediaText(value: string | null | undefined): string | null {
  const localPath = /(?:^\/|^[A-Za-z]:[\\/]|(?:^|[\\/])(?:private|tmp|var|users)(?:[\\/]|$))/iu;
  return value === null || value === undefined || localPath.test(value) ? null : value;
}
export function readingPreviewConfiguration(configuration: ReadingConfiguration, media: ReadonlyMap<string, ReadingPreviewMediaDescriptor>) {
  const definition = configuration.reading;
  return { reading: { contentMode: definition.contentMode, title: definition.title, readingText: definition.readingText, paragraphs: definition.paragraphs.map((paragraph) => ({ ...paragraph })), readingDirection: definition.readingDirection, display: { ...definition.display }, syllableUnits: definition.syllableUnits.map((unit) => ({ ...unit })), readingTools: { ...definition.readingTools }, completion: { ...definition.completion }, allowRetry: definition.allowRetry, hint: { type: definition.hint.type, media: definition.hint.type === "PLAY_AUDIO" ? previewMedia(definition.media.audioKey, media) : [] }, media: { image: previewMedia(definition.media.imageKey, media), audio: previewMedia(definition.media.audioKey, media), instructionAudio: previewMedia(definition.media.instructionAudioKey, media) } } };
}
export function readingAuditSummary(configuration: ReadingConfiguration): { contentMode: ReadingContentMode; paragraphCount: number; textLength: number; hintType: ReadingHintType } {
  const definition = configuration.reading;
  return { contentMode: definition.contentMode, paragraphCount: definition.paragraphs.length, textLength: definition.readingText.length, hintType: definition.hint.type };
}
