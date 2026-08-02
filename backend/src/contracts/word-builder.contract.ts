import { assertSafeStorageKey } from "../storage/local-storage.adapter.js";
import { jsonByteSize } from "../utils/safe-json-schema.js";

export const WORD_BUILDER_MAX_BYTES = 16 * 1024;
export const WORD_BUILDER_MAX_DEPTH = 8;
export const WORD_BUILDER_MAX_UNITS = 12;
export const WORD_BUILDER_MAX_DISTRACTORS = 20;

const UNSAFE_TEXT = /(?:<\s*\/?\s*[a-z][^>]*>|\b(?:javascript|vbscript|data)\s*:|\bfunction\b|\beval\s*\(|\bscript\b|\bon[a-z]+\s*=|\b[a-z][a-z0-9+.-]*:\/\/)/i;
const FORBIDDEN_OBJECT_KEYS = new Set(["__proto__", "prototype", "constructor"]);
const LOCAL_PATH_TEXT = /(?:^\/|^[A-Za-z]:[\\/]|(?:^|[\\/])(?:private|tmp|var|users)(?:[\\/]|$))/iu;
const segmenter = new Intl.Segmenter("ms-MY", { granularity: "grapheme" });

export type WordBuilderMode = "LETTER" | "SYLLABLE";
export type WordBuilderInteractionMode = "CLICK_ORDER" | "DRAG_ORDER" | "BOTH";
export type WordBuilderPromptType = "TEXT" | "IMAGE" | "AUDIO";
export type WordBuilderHintType = "NONE" | "FIRST_UNIT" | "FIRST_TWO_UNITS" | "SHOW_IMAGE" | "PLAY_AUDIO";

export type WordBuilderIssueCode =
  | "WORD_BUILDER_CONFIGURATION_INVALID"
  | "WORD_BUILDER_CONFIGURATION_TOO_LARGE"
  | "WORD_BUILDER_CONFIGURATION_TOO_DEEP"
  | "WORD_BUILDER_UNSAFE_CONTENT"
  | "WORD_BUILDER_UNSUPPORTED_FIELD"
  | "WORD_BUILDER_MODE_INVALID"
  | "WORD_BUILDER_INTERACTION_MODE_INVALID"
  | "WORD_BUILDER_TARGET_WORD_REQUIRED"
  | "WORD_BUILDER_UNITS_REQUIRED"
  | "WORD_BUILDER_UNIT_INVALID"
  | "WORD_BUILDER_UNIT_ID_DUPLICATE"
  | "WORD_BUILDER_SEQUENCE_INVALID"
  | "WORD_BUILDER_SEQUENCE_DUPLICATE"
  | "WORD_BUILDER_SEQUENCE_ORDER_INVALID"
  | "WORD_BUILDER_RECONSTRUCTION_INVALID"
  | "WORD_BUILDER_MAXIMUM_UNITS_INVALID"
  | "WORD_BUILDER_DISTRACTOR_INVALID"
  | "WORD_BUILDER_DISTRACTOR_ID_DUPLICATE"
  | "WORD_BUILDER_DISTRACTOR_ID_CONFLICT"
  | "WORD_BUILDER_PROMPT_INVALID"
  | "WORD_BUILDER_MEDIA_KEY_INVALID"
  | "WORD_BUILDER_HINT_INVALID";

export class WordBuilderContractError extends Error {
  constructor(readonly issues: readonly WordBuilderIssueCode[]) {
    super("Kontrak Word Builder tidak sah.");
    this.name = "WordBuilderContractError";
  }
}

export interface WordBuilderUnit {
  id: string;
  value: string;
  sequence: number;
}

export interface WordBuilderDistractor {
  id: string;
  value: string;
}

export type WordBuilderPrompt =
  | { type: "TEXT"; text: string; mediaKey: null }
  | { type: "IMAGE" | "AUDIO"; text: null; mediaKey: string };

export interface WordBuilderHint {
  type: WordBuilderHintType;
}

export interface WordBuilderDefinition {
  builderMode: WordBuilderMode;
  interactionMode: WordBuilderInteractionMode;
  targetWord: string;
  units: WordBuilderUnit[];
  distractors: WordBuilderDistractor[];
  prompt: WordBuilderPrompt | null;
  showReferenceText: boolean;
  showTargetSlots: boolean;
  shuffleUnits: boolean;
  allowRetry: boolean;
  clearOnRetry: boolean;
  allowReuse: boolean;
  maximumUnits: number;
  hint: WordBuilderHint;
}

export interface WordBuilderConfiguration {
  wordBuilder: WordBuilderDefinition;
}

export interface WordBuilderPreviewMedia {
  key: string;
  url: string | null;
  mimeType: string | null;
  altText: string | null;
  label: string | null;
}

export interface WordBuilderPreviewMediaDescriptor {
  url: string | null;
  mimeType?: string | null;
  altText?: string | null;
  label?: string | null;
}

function fail(...issues: WordBuilderIssueCode[]): never {
  throw new WordBuilderContractError(issues);
}

function asRecord(value: unknown, issue: WordBuilderIssueCode = "WORD_BUILDER_CONFIGURATION_INVALID"): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) fail(issue);
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) fail(issue);
  return value as Record<string, unknown>;
}

function assertSafeJson(value: unknown, depth = 0, seen = new WeakSet<object>()): void {
  if (depth > WORD_BUILDER_MAX_DEPTH) fail("WORD_BUILDER_CONFIGURATION_TOO_DEEP");
  if (value === null || typeof value === "boolean") return;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) fail("WORD_BUILDER_CONFIGURATION_INVALID");
    return;
  }
  if (typeof value === "string") {
    if (UNSAFE_TEXT.test(value)) fail("WORD_BUILDER_UNSAFE_CONTENT");
    return;
  }
  if (!value || typeof value !== "object" || value instanceof Date || Buffer.isBuffer(value) || seen.has(value)) {
    fail("WORD_BUILDER_CONFIGURATION_INVALID");
  }
  seen.add(value);
  if (Array.isArray(value)) {
    for (const entry of value) assertSafeJson(entry, depth + 1, seen);
    return;
  }
  const record = asRecord(value);
  for (const [key, entry] of Object.entries(record)) {
    if (FORBIDDEN_OBJECT_KEYS.has(key) || UNSAFE_TEXT.test(key)) fail("WORD_BUILDER_UNSAFE_CONTENT");
    assertSafeJson(entry, depth + 1, seen);
  }
}

function assertAllowedKeys(value: Record<string, unknown>, allowed: readonly string[]): void {
  for (const key of Object.keys(value)) {
    if (!allowed.includes(key)) fail("WORD_BUILDER_UNSUPPORTED_FIELD");
  }
}

function safeString(value: unknown, issue: WordBuilderIssueCode, maximum: number): string {
  if (typeof value !== "string") fail(issue);
  const result = value.trim().normalize("NFC");
  if (!result || result.length > maximum || UNSAFE_TEXT.test(result) || result.includes("{{") || result.includes("}}")) fail(issue);
  return result;
}

function optionalBoolean(value: unknown, fallback: boolean): boolean {
  if (value === undefined) return fallback;
  if (typeof value !== "boolean") fail("WORD_BUILDER_CONFIGURATION_INVALID");
  return value;
}

function mediaKey(value: unknown): string {
  if (typeof value !== "string" || value !== value.trim() || !value || value.length > 512 || UNSAFE_TEXT.test(value)) fail("WORD_BUILDER_MEDIA_KEY_INVALID");
  try {
    assertSafeStorageKey(value);
  } catch {
    fail("WORD_BUILDER_MEDIA_KEY_INVALID");
  }
  return value;
}

function graphemes(value: string): string[] {
  return [...segmenter.segment(value)].map((entry) => entry.segment);
}

function parseUnit(value: unknown, builderMode: WordBuilderMode): WordBuilderUnit {
  const unit = asRecord(value, "WORD_BUILDER_UNIT_INVALID");
  assertAllowedKeys(unit, ["id", "value", "sequence"]);
  const id = safeString(unit.id, "WORD_BUILDER_UNIT_INVALID", 100);
  const unitValue = safeString(unit.value, "WORD_BUILDER_UNIT_INVALID", 500);
  if (builderMode === "LETTER" && graphemes(unitValue).length !== 1) fail("WORD_BUILDER_UNIT_INVALID");
  if (typeof unit.sequence !== "number" || !Number.isInteger(unit.sequence) || unit.sequence < 1 || unit.sequence > WORD_BUILDER_MAX_UNITS) {
    fail("WORD_BUILDER_SEQUENCE_INVALID");
  }
  return { id, value: unitValue, sequence: unit.sequence };
}

function parseDistractor(value: unknown): WordBuilderDistractor {
  const distractor = asRecord(value, "WORD_BUILDER_DISTRACTOR_INVALID");
  assertAllowedKeys(distractor, ["id", "value"]);
  return {
    id: safeString(distractor.id, "WORD_BUILDER_DISTRACTOR_INVALID", 100),
    value: safeString(distractor.value, "WORD_BUILDER_DISTRACTOR_INVALID", 500),
  };
}

function parsePrompt(value: unknown): WordBuilderPrompt | null {
  if (value === undefined || value === null) return null;
  const prompt = asRecord(value, "WORD_BUILDER_PROMPT_INVALID");
  assertAllowedKeys(prompt, ["type", "text", "mediaKey"]);
  if (prompt.type === "TEXT") {
    if (prompt.mediaKey !== undefined && prompt.mediaKey !== null) fail("WORD_BUILDER_PROMPT_INVALID");
    return { type: "TEXT", text: safeString(prompt.text, "WORD_BUILDER_PROMPT_INVALID", 2_000), mediaKey: null };
  }
  if (prompt.type === "IMAGE" || prompt.type === "AUDIO") {
    if (prompt.text !== undefined && prompt.text !== null) fail("WORD_BUILDER_PROMPT_INVALID");
    return { type: prompt.type, text: null, mediaKey: mediaKey(prompt.mediaKey) };
  }
  fail("WORD_BUILDER_PROMPT_INVALID");
}

function parseHint(value: unknown, prompt: WordBuilderPrompt | null): WordBuilderHint {
  if (value === undefined || value === null) return { type: "NONE" };
  const hint = asRecord(value, "WORD_BUILDER_HINT_INVALID");
  assertAllowedKeys(hint, ["type"]);
  if (hint.type !== "NONE" && hint.type !== "FIRST_UNIT" && hint.type !== "FIRST_TWO_UNITS" && hint.type !== "SHOW_IMAGE" && hint.type !== "PLAY_AUDIO") {
    fail("WORD_BUILDER_HINT_INVALID");
  }
  if (hint.type === "SHOW_IMAGE" && prompt?.type !== "IMAGE") fail("WORD_BUILDER_HINT_INVALID");
  if (hint.type === "PLAY_AUDIO" && prompt?.type !== "AUDIO") fail("WORD_BUILDER_HINT_INVALID");
  return { type: hint.type };
}

function maximumUnits(value: unknown): number {
  if (value === undefined) return WORD_BUILDER_MAX_UNITS;
  if (typeof value !== "number" || !Number.isInteger(value) || value < 1 || value > WORD_BUILDER_MAX_UNITS) {
    fail("WORD_BUILDER_MAXIMUM_UNITS_INVALID");
  }
  return value;
}

export function validateWordBuilderConfiguration(value: unknown): WordBuilderConfiguration {
  if (jsonByteSize(value) > WORD_BUILDER_MAX_BYTES) fail("WORD_BUILDER_CONFIGURATION_TOO_LARGE");
  assertSafeJson(value);
  const configuration = asRecord(value);
  assertAllowedKeys(configuration, ["wordBuilder"]);
  const definition = asRecord(configuration.wordBuilder);
  assertAllowedKeys(definition, ["builderMode", "interactionMode", "targetWord", "units", "distractors", "prompt", "showReferenceText", "showTargetSlots", "shuffleUnits", "allowRetry", "clearOnRetry", "allowReuse", "maximumUnits", "hint"]);
  const builderMode = definition.builderMode;
  if (builderMode !== "LETTER" && builderMode !== "SYLLABLE") fail("WORD_BUILDER_MODE_INVALID");
  const interactionMode = definition.interactionMode;
  if (interactionMode !== "CLICK_ORDER" && interactionMode !== "DRAG_ORDER" && interactionMode !== "BOTH") fail("WORD_BUILDER_INTERACTION_MODE_INVALID");
  const targetWord = safeString(definition.targetWord, "WORD_BUILDER_TARGET_WORD_REQUIRED", 2_000);
  const configuredMaximumUnits = maximumUnits(definition.maximumUnits);
  if (!Array.isArray(definition.units) || definition.units.length === 0 || definition.units.length > configuredMaximumUnits) fail("WORD_BUILDER_UNITS_REQUIRED");
  const units = definition.units.map((unit) => parseUnit(unit, builderMode));
  if (new Set(units.map((unit) => unit.id)).size !== units.length) fail("WORD_BUILDER_UNIT_ID_DUPLICATE");
  if (new Set(units.map((unit) => unit.sequence)).size !== units.length) fail("WORD_BUILDER_SEQUENCE_DUPLICATE");
  const orderedUnits = [...units].sort((left, right) => left.sequence - right.sequence);
  if (orderedUnits.some((unit, index) => unit.sequence !== index + 1)) fail("WORD_BUILDER_SEQUENCE_ORDER_INVALID");
  if (orderedUnits.map((unit) => unit.value).join("").normalize("NFC") !== targetWord) fail("WORD_BUILDER_RECONSTRUCTION_INVALID");
  const distractors = definition.distractors === undefined ? [] : definition.distractors;
  if (!Array.isArray(distractors) || distractors.length > WORD_BUILDER_MAX_DISTRACTORS) fail("WORD_BUILDER_DISTRACTOR_INVALID");
  const parsedDistractors = distractors.map(parseDistractor);
  if (new Set(parsedDistractors.map((distractor) => distractor.id)).size !== parsedDistractors.length) fail("WORD_BUILDER_DISTRACTOR_ID_DUPLICATE");
  if (parsedDistractors.some((distractor) => units.some((unit) => unit.id === distractor.id))) fail("WORD_BUILDER_DISTRACTOR_ID_CONFLICT");
  const prompt = parsePrompt(definition.prompt);
  const hint = parseHint(definition.hint, prompt);
  return {
    wordBuilder: {
      builderMode,
      interactionMode,
      targetWord,
      units: orderedUnits,
      distractors: parsedDistractors,
      prompt,
      showReferenceText: optionalBoolean(definition.showReferenceText, false),
      showTargetSlots: optionalBoolean(definition.showTargetSlots, true),
      shuffleUnits: optionalBoolean(definition.shuffleUnits, true),
      allowRetry: optionalBoolean(definition.allowRetry, true),
      clearOnRetry: optionalBoolean(definition.clearOnRetry, false),
      allowReuse: optionalBoolean(definition.allowReuse, false),
      maximumUnits: configuredMaximumUnits,
      hint,
    },
  };
}

export async function validateWordBuilderMedia(configuration: WordBuilderConfiguration, assertMediaExists: (key: string) => Promise<void>): Promise<void> {
  const key = configuration.wordBuilder.prompt?.mediaKey;
  if (!key) return;
  try {
    await assertMediaExists(key);
  } catch {
    fail("WORD_BUILDER_MEDIA_KEY_INVALID");
  }
}

export function wordBuilderMediaKeys(configuration: WordBuilderConfiguration): string[] {
  const key = configuration.wordBuilder.prompt?.mediaKey;
  return key ? [key] : [];
}

function previewMedia(key: string | null, media: ReadonlyMap<string, WordBuilderPreviewMediaDescriptor>): WordBuilderPreviewMedia[] {
  if (!key) return [];
  const descriptor = media.get(key);
  return [{
    key,
    url: descriptor?.url ?? null,
    mimeType: descriptor?.mimeType ?? null,
    altText: safePreviewMediaText(descriptor?.altText),
    label: safePreviewMediaText(descriptor?.label),
  }];
}

function safePreviewMediaText(value: string | null | undefined): string | null {
  if (value === null || value === undefined || LOCAL_PATH_TEXT.test(value)) return null;
  return value;
}

export function wordBuilderPreviewConfiguration(configuration: WordBuilderConfiguration, media: ReadonlyMap<string, WordBuilderPreviewMediaDescriptor>) {
  const definition = configuration.wordBuilder;
  return {
    wordBuilder: {
      builderMode: definition.builderMode,
      interactionMode: definition.interactionMode,
      targetWord: definition.targetWord,
      units: definition.units.map((unit) => ({ ...unit })),
      distractors: definition.distractors.map((distractor) => ({ ...distractor })),
      prompt: definition.prompt === null
        ? null
        : { type: definition.prompt.type, text: definition.prompt.text, media: previewMedia(definition.prompt.mediaKey, media) },
      showReferenceText: definition.showReferenceText,
      showTargetSlots: definition.showTargetSlots,
      shuffleUnits: definition.shuffleUnits,
      allowRetry: definition.allowRetry,
      clearOnRetry: definition.clearOnRetry,
      allowReuse: definition.allowReuse,
      maximumUnits: definition.maximumUnits,
      hint: { ...definition.hint },
    },
  };
}

export function wordBuilderAuditSummary(configuration: WordBuilderConfiguration): { builderMode: WordBuilderMode; interactionMode: WordBuilderInteractionMode; unitCount: number; distractorCount: number } {
  return {
    builderMode: configuration.wordBuilder.builderMode,
    interactionMode: configuration.wordBuilder.interactionMode,
    unitCount: configuration.wordBuilder.units.length,
    distractorCount: configuration.wordBuilder.distractors.length,
  };
}
