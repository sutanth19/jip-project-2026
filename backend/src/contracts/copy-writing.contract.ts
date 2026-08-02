import { assertSafeStorageKey } from "../storage/local-storage.adapter.js";
import { jsonByteSize } from "../utils/safe-json-schema.js";

export const COPY_WRITING_MAX_BYTES = 16 * 1024;
export const COPY_WRITING_MAX_DEPTH = 8;
export const COPY_WRITING_MAX_REPETITIONS = 10;

const UNSAFE_TEXT = /(?:<\s*\/?\s*[a-z][^>]*>|\b(?:javascript|vbscript|data)\s*:|\bfunction\b|\beval\s*\(|\bscript\b|\bon[a-z]+\s*=|\b[a-z][a-z0-9+.-]*:\/\/)/i;
const FORBIDDEN_OBJECT_KEYS = new Set(["__proto__", "prototype", "constructor"]);
const segmenter = new Intl.Segmenter("ms-MY", { granularity: "grapheme" });

export type CopyWritingContentMode = "LETTER" | "SYLLABLE" | "WORD" | "PHRASE" | "SENTENCE";
export type CopyWritingLineStyle = "NONE" | "BASELINE" | "TWO_LINE" | "THREE_LINE" | "FOUR_LINE";
export type CopyWritingReferencePosition = "TOP" | "LEFT" | "ABOVE_EACH_LINE";
export type CopyWritingHintType = "NONE" | "SHOW_REFERENCE" | "EMPHASIZE_FIRST_CHARACTER" | "PLAY_REFERENCE_AUDIO" | "SHOW_WRITING_LINES";

export type CopyWritingIssueCode =
  | "COPY_WRITING_CONTRACT_REQUIRED"
  | "COPY_WRITING_CONFIGURATION_INVALID"
  | "COPY_WRITING_CONFIGURATION_TOO_LARGE"
  | "COPY_WRITING_CONFIGURATION_TOO_DEEP"
  | "COPY_WRITING_UNSAFE_CONTENT"
  | "COPY_WRITING_UNSUPPORTED_FIELD"
  | "COPY_WRITING_CONTENT_MODE_INVALID"
  | "COPY_WRITING_REFERENCE_TEXT_REQUIRED"
  | "COPY_WRITING_REFERENCE_TEXT_TOO_LONG"
  | "COPY_WRITING_REPETITION_INVALID"
  | "COPY_WRITING_CANVAS_INVALID"
  | "COPY_WRITING_LAYOUT_INVALID"
  | "COPY_WRITING_REFERENCE_DISPLAY_INVALID"
  | "COPY_WRITING_WRITING_DIRECTION_INVALID"
  | "COPY_WRITING_TOOL_CONFIG_INVALID"
  | "COPY_WRITING_COMPLETION_INVALID"
  | "COPY_WRITING_HINT_INVALID"
  | "COPY_WRITING_MEDIA_INVALID"
  | "COPY_WRITING_SYLLABLE_UNITS_INVALID";

export class CopyWritingContractError extends Error {
  constructor(readonly issues: readonly CopyWritingIssueCode[]) {
    super("Kontrak Copy Writing tidak sah.");
    this.name = "CopyWritingContractError";
  }
}

export interface CopyWritingCanvas {
  width: number;
  height: number;
}

export interface CopyWritingLayout {
  lineStyle: CopyWritingLineStyle;
  lineCount: number;
  lineSpacing: number;
  showTopLine: boolean;
  showMidline: boolean;
  showBaseline: boolean;
  showDescenderLine: boolean;
}

export interface CopyWritingReferenceDisplay {
  position: CopyWritingReferencePosition;
  fontSize: number;
  showSyllableBreaks: boolean;
  syllableSeparator: string;
}

export interface CopyWritingSyllableUnit {
  id: string;
  value: string;
  sequence: number;
}

export interface CopyWritingTools {
  allowPen: boolean;
  allowEraser: boolean;
  allowUndo: boolean;
  allowRedo: boolean;
  allowClear: boolean;
  allowStrokeWidthChange: boolean;
  defaultStrokeWidth: number;
}

export interface CopyWritingCompletion {
  minimumStrokeCount: number;
  requireAllRepetitions: boolean;
  minimumWritingRegionsUsed: number | null;
}

export interface CopyWritingMedia {
  referenceImageKey: string | null;
  referenceAudioKey: string | null;
  instructionAudioKey: string | null;
}

export interface CopyWritingHint {
  type: CopyWritingHintType;
}

export interface CopyWritingDefinition {
  contentMode: CopyWritingContentMode;
  referenceText: string;
  repetitionCount: number;
  canvas: CopyWritingCanvas;
  writingLayout: CopyWritingLayout;
  referenceDisplay: CopyWritingReferenceDisplay;
  syllableUnits: CopyWritingSyllableUnit[];
  writingDirection: "LEFT_TO_RIGHT";
  tools: CopyWritingTools;
  completion: CopyWritingCompletion;
  allowRetry: boolean;
  clearOnRetry: boolean;
  hint: CopyWritingHint;
  media: CopyWritingMedia;
}

export interface CopyWritingConfiguration {
  copyWriting: CopyWritingDefinition;
}

export interface CopyWritingPreviewMedia {
  key: string;
  url: string | null;
  mimeType: string | null;
  altText: string | null;
  label: string | null;
}

export interface CopyWritingPreviewMediaDescriptor {
  url: string | null;
  mimeType?: string | null;
  altText?: string | null;
  label?: string | null;
}

function fail(...issues: CopyWritingIssueCode[]): never {
  throw new CopyWritingContractError(issues);
}

function asRecord(value: unknown, issue: CopyWritingIssueCode = "COPY_WRITING_CONTRACT_REQUIRED"): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) fail(issue);
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) fail(issue);
  return value as Record<string, unknown>;
}

function assertSafeJson(value: unknown, depth = 0, seen = new WeakSet<object>()): void {
  if (depth > COPY_WRITING_MAX_DEPTH) fail("COPY_WRITING_CONFIGURATION_TOO_DEEP");
  if (value === null || typeof value === "boolean") return;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) fail("COPY_WRITING_CONFIGURATION_INVALID");
    return;
  }
  if (typeof value === "string") {
    if (UNSAFE_TEXT.test(value)) fail("COPY_WRITING_UNSAFE_CONTENT");
    return;
  }
  if (!value || typeof value !== "object" || value instanceof Date || Buffer.isBuffer(value) || seen.has(value)) fail("COPY_WRITING_CONFIGURATION_INVALID");
  seen.add(value);
  if (Array.isArray(value)) {
    for (const entry of value) assertSafeJson(entry, depth + 1, seen);
    return;
  }
  const record = asRecord(value, "COPY_WRITING_CONFIGURATION_INVALID");
  for (const [key, entry] of Object.entries(record)) {
    if (FORBIDDEN_OBJECT_KEYS.has(key) || UNSAFE_TEXT.test(key)) fail("COPY_WRITING_UNSAFE_CONTENT");
    assertSafeJson(entry, depth + 1, seen);
  }
}

function assertAllowedKeys(value: Record<string, unknown>, allowed: readonly string[]): void {
  for (const key of Object.keys(value)) if (!allowed.includes(key)) fail("COPY_WRITING_UNSUPPORTED_FIELD");
}

function safeString(value: unknown, issue: CopyWritingIssueCode, maximum: number): string {
  if (typeof value !== "string") fail(issue);
  const result = value.trim().normalize("NFC");
  if (!result || result.length > maximum || UNSAFE_TEXT.test(result) || result.includes("{{") || result.includes("}}")) fail(issue);
  return result;
}

function safeDisplayString(value: unknown, issue: CopyWritingIssueCode, maximum: number, fallback: string): string {
  if (value === undefined) return fallback;
  if (typeof value !== "string") fail(issue);
  const result = value.normalize("NFC");
  if (!result.trim() || result.length > maximum || UNSAFE_TEXT.test(result) || result.includes("{{") || result.includes("}}")) fail(issue);
  return result;
}

function requiredBoolean(value: unknown, issue: CopyWritingIssueCode): boolean {
  if (typeof value !== "boolean") fail(issue);
  return value;
}

function optionalBoolean(value: unknown, fallback: boolean, issue: CopyWritingIssueCode): boolean {
  return value === undefined ? fallback : requiredBoolean(value, issue);
}

function graphemes(value: string): string[] {
  return [...segmenter.segment(value)].map((entry) => entry.segment);
}

function parseReferenceText(value: unknown, contentMode: CopyWritingContentMode): string {
  const limits: Record<CopyWritingContentMode, number> = { LETTER: 8, SYLLABLE: 20, WORD: 50, PHRASE: 150, SENTENCE: 300 };
  const referenceText = safeString(value, "COPY_WRITING_REFERENCE_TEXT_REQUIRED", 5_000);
  const length = contentMode === "LETTER" ? graphemes(referenceText).length : [...referenceText].length;
  if (length > limits[contentMode]) fail("COPY_WRITING_REFERENCE_TEXT_TOO_LONG");
  if ((contentMode === "LETTER" || contentMode === "SYLLABLE" || contentMode === "WORD") && /\s/u.test(referenceText)) fail("COPY_WRITING_REFERENCE_TEXT_REQUIRED");
  return referenceText;
}

function parseRepetitionCount(value: unknown): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 1 || value > COPY_WRITING_MAX_REPETITIONS) fail("COPY_WRITING_REPETITION_INVALID");
  return value;
}

function parseCanvas(value: unknown): CopyWritingCanvas {
  const canvas = asRecord(value, "COPY_WRITING_CANVAS_INVALID");
  assertAllowedKeys(canvas, ["width", "height"]);
  if (typeof canvas.width !== "number" || !Number.isInteger(canvas.width) || canvas.width < 400 || canvas.width > 2_000) fail("COPY_WRITING_CANVAS_INVALID");
  if (typeof canvas.height !== "number" || !Number.isInteger(canvas.height) || canvas.height < 200 || canvas.height > 1_600) fail("COPY_WRITING_CANVAS_INVALID");
  return { width: canvas.width, height: canvas.height };
}

function parseLayout(value: unknown, canvas: CopyWritingCanvas, repetitionCount: number, requireAllRepetitions: boolean): CopyWritingLayout {
  const layout = asRecord(value, "COPY_WRITING_LAYOUT_INVALID");
  assertAllowedKeys(layout, ["lineStyle", "lineCount", "lineSpacing", "showTopLine", "showMidline", "showBaseline", "showDescenderLine"]);
  const lineStyle = layout.lineStyle;
  if (lineStyle !== "NONE" && lineStyle !== "BASELINE" && lineStyle !== "TWO_LINE" && lineStyle !== "THREE_LINE" && lineStyle !== "FOUR_LINE") fail("COPY_WRITING_LAYOUT_INVALID");
  if (typeof layout.lineCount !== "number" || !Number.isInteger(layout.lineCount) || layout.lineCount < 1 || layout.lineCount > COPY_WRITING_MAX_REPETITIONS) fail("COPY_WRITING_LAYOUT_INVALID");
  if (requireAllRepetitions && layout.lineCount < repetitionCount) fail("COPY_WRITING_LAYOUT_INVALID");
  if (typeof layout.lineSpacing !== "number" || !Number.isInteger(layout.lineSpacing) || layout.lineSpacing < 24 || layout.lineSpacing > 400 || layout.lineCount * layout.lineSpacing > canvas.height) fail("COPY_WRITING_LAYOUT_INVALID");
  const showTopLine = requiredBoolean(layout.showTopLine, "COPY_WRITING_LAYOUT_INVALID");
  const showMidline = requiredBoolean(layout.showMidline, "COPY_WRITING_LAYOUT_INVALID");
  const showBaseline = requiredBoolean(layout.showBaseline, "COPY_WRITING_LAYOUT_INVALID");
  const showDescenderLine = requiredBoolean(layout.showDescenderLine, "COPY_WRITING_LAYOUT_INVALID");
  const expected: Record<CopyWritingLineStyle, readonly boolean[]> = {
    NONE: [false, false, false, false],
    BASELINE: [false, false, true, false],
    TWO_LINE: [true, false, true, false],
    THREE_LINE: [true, true, true, false],
    FOUR_LINE: [true, true, true, true],
  };
  const actual = [showTopLine, showMidline, showBaseline, showDescenderLine];
  if (expected[lineStyle].some((entry, index) => entry !== actual[index])) fail("COPY_WRITING_LAYOUT_INVALID");
  return { lineStyle, lineCount: layout.lineCount, lineSpacing: layout.lineSpacing, showTopLine, showMidline, showBaseline, showDescenderLine };
}

function parseReferenceDisplay(value: unknown): CopyWritingReferenceDisplay {
  const display = asRecord(value, "COPY_WRITING_REFERENCE_DISPLAY_INVALID");
  assertAllowedKeys(display, ["position", "fontSize", "showSyllableBreaks", "syllableSeparator"]);
  const position = display.position;
  if (position !== "TOP" && position !== "LEFT" && position !== "ABOVE_EACH_LINE") fail("COPY_WRITING_REFERENCE_DISPLAY_INVALID");
  if (typeof display.fontSize !== "number" || !Number.isInteger(display.fontSize) || display.fontSize < 24 || display.fontSize > 160) fail("COPY_WRITING_REFERENCE_DISPLAY_INVALID");
  return {
    position,
    fontSize: display.fontSize,
    showSyllableBreaks: requiredBoolean(display.showSyllableBreaks, "COPY_WRITING_REFERENCE_DISPLAY_INVALID"),
    syllableSeparator: safeDisplayString(display.syllableSeparator, "COPY_WRITING_REFERENCE_DISPLAY_INVALID", 20, " · "),
  };
}

function parseSyllableUnits(value: unknown, referenceText: string, showSyllableBreaks: boolean): CopyWritingSyllableUnit[] {
  if (!showSyllableBreaks) {
    if (value !== undefined && value !== null) fail("COPY_WRITING_SYLLABLE_UNITS_INVALID");
    return [];
  }
  if (!Array.isArray(value) || value.length === 0 || value.length > 50) fail("COPY_WRITING_SYLLABLE_UNITS_INVALID");
  const units = value.map((entry): CopyWritingSyllableUnit => {
    const unit = asRecord(entry, "COPY_WRITING_SYLLABLE_UNITS_INVALID");
    assertAllowedKeys(unit, ["id", "value", "sequence"]);
    if (typeof unit.sequence !== "number" || !Number.isInteger(unit.sequence) || unit.sequence < 1 || unit.sequence > 50) fail("COPY_WRITING_SYLLABLE_UNITS_INVALID");
    return { id: safeString(unit.id, "COPY_WRITING_SYLLABLE_UNITS_INVALID", 100), value: safeString(unit.value, "COPY_WRITING_SYLLABLE_UNITS_INVALID", 100), sequence: unit.sequence };
  });
  if (new Set(units.map((unit) => unit.id)).size !== units.length || new Set(units.map((unit) => unit.sequence)).size !== units.length) fail("COPY_WRITING_SYLLABLE_UNITS_INVALID");
  const ordered = [...units].sort((left, right) => left.sequence - right.sequence);
  if (ordered.some((unit, index) => unit.sequence !== index + 1) || ordered.map((unit) => unit.value).join("").normalize("NFC") !== referenceText) fail("COPY_WRITING_SYLLABLE_UNITS_INVALID");
  return ordered;
}

function parseTools(value: unknown): CopyWritingTools {
  const tools = asRecord(value, "COPY_WRITING_TOOL_CONFIG_INVALID");
  assertAllowedKeys(tools, ["allowPen", "allowEraser", "allowUndo", "allowRedo", "allowClear", "allowStrokeWidthChange", "defaultStrokeWidth"]);
  const allowPen = requiredBoolean(tools.allowPen, "COPY_WRITING_TOOL_CONFIG_INVALID");
  const allowEraser = requiredBoolean(tools.allowEraser, "COPY_WRITING_TOOL_CONFIG_INVALID");
  const allowUndo = requiredBoolean(tools.allowUndo, "COPY_WRITING_TOOL_CONFIG_INVALID");
  const allowRedo = requiredBoolean(tools.allowRedo, "COPY_WRITING_TOOL_CONFIG_INVALID");
  const allowClear = requiredBoolean(tools.allowClear, "COPY_WRITING_TOOL_CONFIG_INVALID");
  const allowStrokeWidthChange = requiredBoolean(tools.allowStrokeWidthChange, "COPY_WRITING_TOOL_CONFIG_INVALID");
  if (!allowPen || (allowRedo && !allowUndo) || typeof tools.defaultStrokeWidth !== "number" || !Number.isInteger(tools.defaultStrokeWidth) || tools.defaultStrokeWidth < 2 || tools.defaultStrokeWidth > 20) fail("COPY_WRITING_TOOL_CONFIG_INVALID");
  return { allowPen, allowEraser, allowUndo, allowRedo, allowClear, allowStrokeWidthChange, defaultStrokeWidth: tools.defaultStrokeWidth };
}

function parseCompletion(value: unknown): CopyWritingCompletion {
  const completion = asRecord(value, "COPY_WRITING_COMPLETION_INVALID");
  assertAllowedKeys(completion, ["minimumStrokeCount", "requireAllRepetitions", "minimumWritingRegionsUsed"]);
  if (typeof completion.minimumStrokeCount !== "number" || !Number.isInteger(completion.minimumStrokeCount) || completion.minimumStrokeCount < 1 || completion.minimumStrokeCount > 500) fail("COPY_WRITING_COMPLETION_INVALID");
  const minimumWritingRegionsUsed = completion.minimumWritingRegionsUsed;
  if (minimumWritingRegionsUsed !== undefined && (typeof minimumWritingRegionsUsed !== "number" || !Number.isInteger(minimumWritingRegionsUsed) || minimumWritingRegionsUsed < 1 || minimumWritingRegionsUsed > COPY_WRITING_MAX_REPETITIONS)) fail("COPY_WRITING_COMPLETION_INVALID");
  return { minimumStrokeCount: completion.minimumStrokeCount, requireAllRepetitions: requiredBoolean(completion.requireAllRepetitions, "COPY_WRITING_COMPLETION_INVALID"), minimumWritingRegionsUsed: minimumWritingRegionsUsed ?? null };
}

function mediaKey(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string" || value !== value.trim() || !value || value.length > 512 || UNSAFE_TEXT.test(value)) fail("COPY_WRITING_MEDIA_INVALID");
  try { assertSafeStorageKey(value); } catch { fail("COPY_WRITING_MEDIA_INVALID"); }
  return value;
}

function parseMedia(value: unknown): CopyWritingMedia {
  if (value === undefined || value === null) return { referenceImageKey: null, referenceAudioKey: null, instructionAudioKey: null };
  const media = asRecord(value, "COPY_WRITING_MEDIA_INVALID");
  assertAllowedKeys(media, ["referenceImageKey", "referenceAudioKey", "instructionAudioKey"]);
  return { referenceImageKey: mediaKey(media.referenceImageKey), referenceAudioKey: mediaKey(media.referenceAudioKey), instructionAudioKey: mediaKey(media.instructionAudioKey) };
}

function parseHint(value: unknown, media: CopyWritingMedia): CopyWritingHint {
  if (value === undefined || value === null) return { type: "NONE" };
  const hint = asRecord(value, "COPY_WRITING_HINT_INVALID");
  assertAllowedKeys(hint, ["type"]);
  if (hint.type !== "NONE" && hint.type !== "SHOW_REFERENCE" && hint.type !== "EMPHASIZE_FIRST_CHARACTER" && hint.type !== "PLAY_REFERENCE_AUDIO" && hint.type !== "SHOW_WRITING_LINES") fail("COPY_WRITING_HINT_INVALID");
  if (hint.type === "PLAY_REFERENCE_AUDIO" && !media.referenceAudioKey) fail("COPY_WRITING_HINT_INVALID");
  return { type: hint.type };
}

export function validateCopyWritingConfiguration(value: unknown): CopyWritingConfiguration {
  if (jsonByteSize(value) > COPY_WRITING_MAX_BYTES) fail("COPY_WRITING_CONFIGURATION_TOO_LARGE");
  assertSafeJson(value);
  const configuration = asRecord(value);
  assertAllowedKeys(configuration, ["copyWriting"]);
  const definition = asRecord(configuration.copyWriting);
  assertAllowedKeys(definition, ["contentMode", "referenceText", "repetitionCount", "canvas", "writingLayout", "referenceDisplay", "syllableUnits", "writingDirection", "tools", "completion", "allowRetry", "clearOnRetry", "hint", "media"]);
  const contentMode = definition.contentMode;
  if (contentMode !== "LETTER" && contentMode !== "SYLLABLE" && contentMode !== "WORD" && contentMode !== "PHRASE" && contentMode !== "SENTENCE") fail("COPY_WRITING_CONTENT_MODE_INVALID");
  const referenceText = parseReferenceText(definition.referenceText, contentMode);
  const repetitionCount = parseRepetitionCount(definition.repetitionCount);
  const canvas = parseCanvas(definition.canvas);
  const completion = parseCompletion(definition.completion);
  const writingLayout = parseLayout(definition.writingLayout, canvas, repetitionCount, completion.requireAllRepetitions);
  const referenceDisplay = parseReferenceDisplay(definition.referenceDisplay);
  const syllableUnits = parseSyllableUnits(definition.syllableUnits, referenceText, referenceDisplay.showSyllableBreaks);
  if (definition.writingDirection !== "LEFT_TO_RIGHT") fail("COPY_WRITING_WRITING_DIRECTION_INVALID");
  const tools = parseTools(definition.tools);
  const media = parseMedia(definition.media);
  const hint = parseHint(definition.hint, media);
  return {
    copyWriting: {
      contentMode,
      referenceText,
      repetitionCount,
      canvas,
      writingLayout,
      referenceDisplay,
      syllableUnits,
      writingDirection: "LEFT_TO_RIGHT",
      tools,
      completion,
      allowRetry: optionalBoolean(definition.allowRetry, true, "COPY_WRITING_CONFIGURATION_INVALID"),
      clearOnRetry: optionalBoolean(definition.clearOnRetry, false, "COPY_WRITING_CONFIGURATION_INVALID"),
      hint,
      media,
    },
  };
}

export async function validateCopyWritingMedia(configuration: CopyWritingConfiguration, assertMediaExists: (key: string) => Promise<void>): Promise<void> {
  for (const key of copyWritingMediaKeys(configuration)) {
    try { await assertMediaExists(key); } catch { fail("COPY_WRITING_MEDIA_INVALID"); }
  }
}

export function copyWritingMediaKeys(configuration: CopyWritingConfiguration): string[] {
  const media = configuration.copyWriting.media;
  return [media.referenceImageKey, media.referenceAudioKey, media.instructionAudioKey].filter((key): key is string => key !== null);
}

function safePreviewMediaText(value: string | null | undefined): string | null {
  const localPath = /(?:^\/|^[A-Za-z]:[\\/]|(?:^|[\\/])(?:private|tmp|var|users)(?:[\\/]|$))/iu;
  return value === null || value === undefined || localPath.test(value) ? null : value;
}

function previewMedia(key: string | null, media: ReadonlyMap<string, CopyWritingPreviewMediaDescriptor>): CopyWritingPreviewMedia[] {
  if (!key) return [];
  const descriptor = media.get(key);
  return [{ key, url: descriptor?.url ?? null, mimeType: descriptor?.mimeType ?? null, altText: safePreviewMediaText(descriptor?.altText), label: safePreviewMediaText(descriptor?.label) }];
}

export function copyWritingPreviewConfiguration(configuration: CopyWritingConfiguration, media: ReadonlyMap<string, CopyWritingPreviewMediaDescriptor>) {
  const definition = configuration.copyWriting;
  const referenceImage = previewMedia(definition.media.referenceImageKey, media);
  const referenceAudio = previewMedia(definition.media.referenceAudioKey, media);
  const instructionAudio = previewMedia(definition.media.instructionAudioKey, media);
  return {
    copyWriting: {
      contentMode: definition.contentMode,
      referenceText: definition.referenceText,
      repetitionCount: definition.repetitionCount,
      canvas: { ...definition.canvas },
      writingLayout: { ...definition.writingLayout },
      referenceDisplay: { ...definition.referenceDisplay },
      syllableUnits: definition.syllableUnits.map((unit) => ({ ...unit })),
      writingDirection: definition.writingDirection,
      tools: { ...definition.tools },
      completion: { ...definition.completion },
      allowRetry: definition.allowRetry,
      clearOnRetry: definition.clearOnRetry,
      hint: { type: definition.hint.type, media: definition.hint.type === "PLAY_REFERENCE_AUDIO" ? referenceAudio : [] },
      media: { referenceImage, referenceAudio, instructionAudio },
    },
  };
}

export function copyWritingAuditSummary(configuration: CopyWritingConfiguration): { contentMode: CopyWritingContentMode; referenceTextLength: number; repetitionCount: number; lineStyle: CopyWritingLineStyle; lineCount: number; hintType: CopyWritingHintType } {
  const definition = configuration.copyWriting;
  return { contentMode: definition.contentMode, referenceTextLength: [...definition.referenceText].length, repetitionCount: definition.repetitionCount, lineStyle: definition.writingLayout.lineStyle, lineCount: definition.writingLayout.lineCount, hintType: definition.hint.type };
}
