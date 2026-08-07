import { jsonByteSize } from "../utils/safe-json-schema.js";

export const ARRANGE_SYLLABLES_MAX_BYTES = 16 * 1024;
export const ARRANGE_SYLLABLES_MAX_DEPTH = 8;
export const ARRANGE_SYLLABLES_MAX_SYLLABLES = 10;
export const ARRANGE_SYLLABLES_MAX_WORDS = 6;
export const ARRANGE_SYLLABLES_MAX_DISTRACTORS = 12;

const UNSAFE_TEXT = /(?:<\s*\/?\s*[a-z][^>]*>|javascript\s*:|\bfunction\b|\beval\s*\(|\bscript\b|\bon[a-z]+\s*=|\b(?:https?|data):\/\/)/i;
const FORBIDDEN_OBJECT_KEYS = new Set(["__proto__", "prototype", "constructor"]);

export type ArrangeSyllablesInteractionMode = "CLICK_ORDER" | "DRAG_ORDER" | "BOTH" | "DRAG_TO_BLANK";
export type ArrangeSyllablesContractMode = "ORDERED_RECONSTRUCTION" | "MISSING_SYLLABLES";

export type ArrangeSyllablesIssueCode =
  | "ARRANGE_SYLLABLES_CONFIGURATION_INVALID"
  | "ARRANGE_SYLLABLES_CONFIGURATION_TOO_LARGE"
  | "ARRANGE_SYLLABLES_CONFIGURATION_TOO_DEEP"
  | "ARRANGE_SYLLABLES_UNSAFE_CONTENT"
  | "ARRANGE_SYLLABLES_UNSUPPORTED_FIELD"
  | "ARRANGE_SYLLABLES_INTERACTION_MODE_INVALID"
  | "ARRANGE_SYLLABLES_TARGET_WORD_REQUIRED"
  | "ARRANGE_SYLLABLES_REQUIRED"
  | "ARRANGE_SYLLABLE_INVALID"
  | "ARRANGE_SYLLABLE_ID_DUPLICATE"
  | "ARRANGE_SYLLABLE_SEQUENCE_INVALID"
  | "ARRANGE_SYLLABLE_SEQUENCE_DUPLICATE"
  | "ARRANGE_SYLLABLE_SEQUENCE_ORDER_INVALID"
  | "ARRANGE_SYLLABLE_RECONSTRUCTION_INVALID"
  | "ARRANGE_SYLLABLES_MAXIMUM_INVALID"
  | "ARRANGE_SYLLABLES_WORDS_REQUIRED"
  | "ARRANGE_SYLLABLES_WORD_INVALID"
  | "ARRANGE_SYLLABLES_WORD_SEQUENCE_DUPLICATE"
  | "ARRANGE_SYLLABLES_WORD_SEQUENCE_INVALID"
  | "ARRANGE_SYLLABLES_MISSING_REQUIRED"
  | "ARRANGE_SYLLABLES_DISTRACTORS_REQUIRED"
  | "ARRANGE_SYLLABLES_DISTRACTOR_INVALID"
  | "ARRANGE_SYLLABLES_DISTRACTOR_DUPLICATE"
  | "ARRANGE_SYLLABLES_ANSWER_MAPPING_INVALID"
  | "ARRANGE_SYLLABLES_HINT_INVALID";

export class ArrangeSyllablesContractError extends Error {
  constructor(readonly issues: readonly ArrangeSyllablesIssueCode[]) {
    super("Kontrak Arrange Syllables tidak sah.");
    this.name = "ArrangeSyllablesContractError";
  }
}

export interface ArrangeSyllable {
  id: string;
  value: string;
  sequence: number;
}

export interface ArrangeSyllablesLegacyDefinition {
  mode: "ORDERED_RECONSTRUCTION";
  interactionMode: "CLICK_ORDER" | "DRAG_ORDER" | "BOTH";
  targetWord: string;
  syllables: ArrangeSyllable[];
  showReferenceText: boolean;
  showTargetSlots: boolean;
  shuffleSyllables: boolean;
  allowRetry: boolean;
  clearOnRetry: boolean;
  maximumSyllables: number;
}

export interface MissingSyllableUnit {
  id: string;
  value: string;
  sequence: number;
  isMissing: boolean;
}

export interface MissingSyllableWord {
  id: string;
  sequence: number;
  syllables: MissingSyllableUnit[];
}

export interface MissingSyllableDistractor {
  id: string;
  value: string;
  sequence: number;
}

export interface ArrangeSyllablesMediaAsset {
  mediaKey: string;
  url: string;
  mimeType: string | null;
  originalName: string | null;
  mediaRole: "PRIMARY_IMAGE" | "REFERENCE_AUDIO";
  altText: string | null;
}

export interface ArrangeSyllablesMissingDefinition {
  mode: "MISSING_SYLLABLES";
  interactionMode: "DRAG_TO_BLANK";
  words: MissingSyllableWord[];
  distractors: MissingSyllableDistractor[];
  hint: string | null;
  media?: {
    image: ArrangeSyllablesMediaAsset | null;
    audio: ArrangeSyllablesMediaAsset | null;
  };
  showReferenceText: boolean;
  allowRetry: boolean;
  clearOnRetry: boolean;
  maximumSyllables: number;
}

export type ArrangeSyllablesDefinition =
  | ArrangeSyllablesLegacyDefinition
  | ArrangeSyllablesMissingDefinition;

export interface ArrangeSyllablesConfiguration {
  arrangeSyllables: ArrangeSyllablesDefinition;
}

function fail(...issues: ArrangeSyllablesIssueCode[]): never {
  throw new ArrangeSyllablesContractError(issues);
}

function asRecord(value: unknown, issue: ArrangeSyllablesIssueCode = "ARRANGE_SYLLABLES_CONFIGURATION_INVALID"): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) fail(issue);
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) fail(issue);
  return value as Record<string, unknown>;
}

function parseRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function isAllowedMediaUrlPath(path: readonly string[]): boolean {
  return path.length >= 2 && path[path.length - 1] === "url" && (path[path.length - 2] === "image" || path[path.length - 2] === "audio");
}

function assertSafeJson(value: unknown, depth = 0, seen = new WeakSet<object>(), path: readonly string[] = []): void {
  if (depth > ARRANGE_SYLLABLES_MAX_DEPTH) fail("ARRANGE_SYLLABLES_CONFIGURATION_TOO_DEEP");
  if (value === null || typeof value === "boolean") return;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) fail("ARRANGE_SYLLABLES_CONFIGURATION_INVALID");
    return;
  }
  if (typeof value === "string") {
    if (!(isAllowedMediaUrlPath(path) && /^https?:\/\//i.test(value)) && UNSAFE_TEXT.test(value)) fail("ARRANGE_SYLLABLES_UNSAFE_CONTENT");
    return;
  }
  if (!value || typeof value !== "object" || value instanceof Date || Buffer.isBuffer(value) || seen.has(value)) {
    fail("ARRANGE_SYLLABLES_CONFIGURATION_INVALID");
  }
  seen.add(value);
  if (Array.isArray(value)) {
    for (const [index, entry] of value.entries()) assertSafeJson(entry, depth + 1, seen, [...path, String(index)]);
    return;
  }
  const record = asRecord(value);
  for (const [key, entry] of Object.entries(record)) {
    if (FORBIDDEN_OBJECT_KEYS.has(key) || UNSAFE_TEXT.test(key)) fail("ARRANGE_SYLLABLES_UNSAFE_CONTENT");
    assertSafeJson(entry, depth + 1, seen, [...path, key]);
  }
}

function assertAllowedKeys(value: Record<string, unknown>, allowed: readonly string[]): void {
  for (const key of Object.keys(value)) {
    if (!allowed.includes(key)) fail("ARRANGE_SYLLABLES_UNSUPPORTED_FIELD");
  }
}

function safeString(value: unknown, issue: ArrangeSyllablesIssueCode, maximum: number): string {
  if (typeof value !== "string") fail(issue);
  const result = value.trim().normalize("NFC");
  if (!result || result.length > maximum || UNSAFE_TEXT.test(result) || result.includes("{{") || result.includes("}}")) fail(issue);
  return result;
}

function optionalSafeString(value: unknown, issue: ArrangeSyllablesIssueCode, maximum: number): string | null {
  if (value === undefined || value === null || value === "") return null;
  return safeString(value, issue, maximum);
}

function requiredBoolean(value: unknown): boolean {
  if (typeof value !== "boolean") fail("ARRANGE_SYLLABLES_CONFIGURATION_INVALID");
  return value;
}

function optionalBoolean(value: unknown, fallback: boolean): boolean {
  return value === undefined ? fallback : requiredBoolean(value);
}

function maximumSyllables(value: unknown): number {
  if (value === undefined) return ARRANGE_SYLLABLES_MAX_SYLLABLES;
  if (typeof value !== "number" || !Number.isInteger(value) || value < 1 || value > ARRANGE_SYLLABLES_MAX_SYLLABLES) {
    fail("ARRANGE_SYLLABLES_MAXIMUM_INVALID");
  }
  return value;
}

function parseLegacySyllable(value: unknown): ArrangeSyllable {
  const syllable = asRecord(value, "ARRANGE_SYLLABLE_INVALID");
  assertAllowedKeys(syllable, ["id", "value", "sequence"]);
  const id = safeString(syllable.id, "ARRANGE_SYLLABLE_INVALID", 100);
  const syllableValue = safeString(syllable.value, "ARRANGE_SYLLABLE_INVALID", 500);
  if (typeof syllable.sequence !== "number" || !Number.isInteger(syllable.sequence) || syllable.sequence < 1 || syllable.sequence > ARRANGE_SYLLABLES_MAX_SYLLABLES) {
    fail("ARRANGE_SYLLABLE_SEQUENCE_INVALID");
  }
  return { id, value: syllableValue, sequence: syllable.sequence };
}

function parseMissingSyllableUnit(value: unknown): MissingSyllableUnit {
  const syllable = asRecord(value, "ARRANGE_SYLLABLE_INVALID");
  assertAllowedKeys(syllable, ["id", "value", "sequence", "isMissing"]);
  const id = safeString(syllable.id, "ARRANGE_SYLLABLE_INVALID", 100);
  const syllableValue = safeString(syllable.value, "ARRANGE_SYLLABLE_INVALID", 500);
  if (typeof syllable.sequence !== "number" || !Number.isInteger(syllable.sequence) || syllable.sequence < 1 || syllable.sequence > ARRANGE_SYLLABLES_MAX_SYLLABLES) {
    fail("ARRANGE_SYLLABLE_SEQUENCE_INVALID");
  }
  if (typeof syllable.isMissing !== "boolean") fail("ARRANGE_SYLLABLE_INVALID");
  return { id, value: syllableValue, sequence: syllable.sequence, isMissing: syllable.isMissing };
}

function parseMissingSyllableWord(value: unknown): MissingSyllableWord {
  const word = asRecord(value, "ARRANGE_SYLLABLES_WORD_INVALID");
  assertAllowedKeys(word, ["id", "sequence", "syllables"]);
  const id = safeString(word.id, "ARRANGE_SYLLABLES_WORD_INVALID", 100);
  if (typeof word.sequence !== "number" || !Number.isInteger(word.sequence) || word.sequence < 1 || word.sequence > ARRANGE_SYLLABLES_MAX_WORDS) {
    fail("ARRANGE_SYLLABLES_WORD_SEQUENCE_INVALID");
  }
  if (!Array.isArray(word.syllables) || word.syllables.length === 0) fail("ARRANGE_SYLLABLES_WORD_INVALID");
  const syllables = word.syllables.map(parseMissingSyllableUnit);
  if (new Set(syllables.map((syllable) => syllable.id)).size !== syllables.length) fail("ARRANGE_SYLLABLE_ID_DUPLICATE");
  if (new Set(syllables.map((syllable) => syllable.sequence)).size !== syllables.length) fail("ARRANGE_SYLLABLE_SEQUENCE_DUPLICATE");
  const ordered = [...syllables].sort((left, right) => left.sequence - right.sequence);
  if (ordered.some((syllable, index) => syllable.sequence !== index + 1)) fail("ARRANGE_SYLLABLE_SEQUENCE_ORDER_INVALID");
  return { id, sequence: word.sequence, syllables: ordered };
}

function parseMissingSyllableDistractor(value: unknown): MissingSyllableDistractor {
  const distractor = asRecord(value, "ARRANGE_SYLLABLES_DISTRACTOR_INVALID");
  assertAllowedKeys(distractor, ["id", "value", "sequence"]);
  const id = safeString(distractor.id, "ARRANGE_SYLLABLES_DISTRACTOR_INVALID", 100);
  const distractorValue = safeString(distractor.value, "ARRANGE_SYLLABLES_DISTRACTOR_INVALID", 500);
  if (typeof distractor.sequence !== "number" || !Number.isInteger(distractor.sequence) || distractor.sequence < 1 || distractor.sequence > ARRANGE_SYLLABLES_MAX_DISTRACTORS) {
    fail("ARRANGE_SYLLABLE_SEQUENCE_INVALID");
  }
  return { id, value: distractorValue, sequence: distractor.sequence };
}

function validateLegacyDefinition(definition: Record<string, unknown>, configuredMaximumSyllables: number): ArrangeSyllablesLegacyDefinition {
  assertAllowedKeys(definition, ["mode", "interactionMode", "targetWord", "syllables", "showReferenceText", "showTargetSlots", "shuffleSyllables", "allowRetry", "clearOnRetry", "maximumSyllables"]);
  const interactionMode = definition.interactionMode;
  if (interactionMode !== "CLICK_ORDER" && interactionMode !== "DRAG_ORDER" && interactionMode !== "BOTH") fail("ARRANGE_SYLLABLES_INTERACTION_MODE_INVALID");
  const targetWord = safeString(definition.targetWord, "ARRANGE_SYLLABLES_TARGET_WORD_REQUIRED", 2_000);
  if (!Array.isArray(definition.syllables) || definition.syllables.length === 0 || definition.syllables.length > configuredMaximumSyllables) fail("ARRANGE_SYLLABLES_REQUIRED");
  const syllables = definition.syllables.map(parseLegacySyllable);
  if (new Set(syllables.map((syllable) => syllable.id)).size !== syllables.length) fail("ARRANGE_SYLLABLE_ID_DUPLICATE");
  if (new Set(syllables.map((syllable) => syllable.sequence)).size !== syllables.length) fail("ARRANGE_SYLLABLE_SEQUENCE_DUPLICATE");
  const orderedSyllables = [...syllables].sort((left, right) => left.sequence - right.sequence);
  if (orderedSyllables.some((syllable, index) => syllable.sequence !== index + 1)) fail("ARRANGE_SYLLABLE_SEQUENCE_ORDER_INVALID");
  if (orderedSyllables.map((syllable) => syllable.value).join("").normalize("NFC") !== targetWord) fail("ARRANGE_SYLLABLE_RECONSTRUCTION_INVALID");
  return {
    mode: "ORDERED_RECONSTRUCTION",
    interactionMode,
    targetWord,
    syllables: orderedSyllables,
    showReferenceText: optionalBoolean(definition.showReferenceText, false),
    showTargetSlots: optionalBoolean(definition.showTargetSlots, true),
    shuffleSyllables: optionalBoolean(definition.shuffleSyllables, true),
    allowRetry: optionalBoolean(definition.allowRetry, true),
    clearOnRetry: optionalBoolean(definition.clearOnRetry, false),
    maximumSyllables: configuredMaximumSyllables,
  };
}

function validateMissingDefinition(definition: Record<string, unknown>, configuredMaximumSyllables: number): ArrangeSyllablesMissingDefinition {
  assertAllowedKeys(definition, ["mode", "interactionMode", "words", "distractors", "hint", "media", "showReferenceText", "allowRetry", "clearOnRetry", "maximumSyllables"]);
  if (definition.interactionMode !== "DRAG_TO_BLANK") fail("ARRANGE_SYLLABLES_INTERACTION_MODE_INVALID");
  if (!Array.isArray(definition.words) || definition.words.length === 0 || definition.words.length > ARRANGE_SYLLABLES_MAX_WORDS) fail("ARRANGE_SYLLABLES_WORDS_REQUIRED");
  const words = definition.words.map(parseMissingSyllableWord).sort((left, right) => left.sequence - right.sequence);
  if (new Set(words.map((word) => word.id)).size !== words.length) fail("ARRANGE_SYLLABLE_ID_DUPLICATE");
  if (new Set(words.map((word) => word.sequence)).size !== words.length) fail("ARRANGE_SYLLABLES_WORD_SEQUENCE_DUPLICATE");
  if (words.some((word, index) => word.sequence !== index + 1)) fail("ARRANGE_SYLLABLES_WORD_SEQUENCE_INVALID");
  const allSyllables = words.flatMap((word) => word.syllables);
  if (allSyllables.length === 0 || allSyllables.length > configuredMaximumSyllables) fail("ARRANGE_SYLLABLES_REQUIRED");
  if (new Set(allSyllables.map((syllable) => syllable.id)).size !== allSyllables.length) fail("ARRANGE_SYLLABLE_ID_DUPLICATE");
  const missingUnits = allSyllables.filter((syllable) => syllable.isMissing);
  if (missingUnits.length === 0) fail("ARRANGE_SYLLABLES_MISSING_REQUIRED");
  if (!Array.isArray(definition.distractors) || definition.distractors.length < missingUnits.length || definition.distractors.length > ARRANGE_SYLLABLES_MAX_DISTRACTORS) {
    fail("ARRANGE_SYLLABLES_DISTRACTORS_REQUIRED");
  }
  const distractors = definition.distractors.map(parseMissingSyllableDistractor).sort((left, right) => left.sequence - right.sequence);
  if (new Set(distractors.map((distractor) => distractor.id)).size !== distractors.length) fail("ARRANGE_SYLLABLES_DISTRACTOR_DUPLICATE");
  if (new Set(distractors.map((distractor) => distractor.sequence)).size !== distractors.length) fail("ARRANGE_SYLLABLE_SEQUENCE_DUPLICATE");
  const missingCounts = new Map<string, number>();
  const distractorCounts = new Map<string, number>();
  for (const syllable of missingUnits) missingCounts.set(syllable.value, (missingCounts.get(syllable.value) ?? 0) + 1);
  for (const distractor of distractors) distractorCounts.set(distractor.value, (distractorCounts.get(distractor.value) ?? 0) + 1);
  for (const [value, count] of missingCounts) {
    if ((distractorCounts.get(value) ?? 0) < count) fail("ARRANGE_SYLLABLES_ANSWER_MAPPING_INVALID");
  }
  const media = parseRecord(definition.media);
  return {
    mode: "MISSING_SYLLABLES",
    interactionMode: "DRAG_TO_BLANK",
    words,
    distractors,
    hint: optionalSafeString(definition.hint, "ARRANGE_SYLLABLES_HINT_INVALID", 1_000),
    media: media ? {
      ...(() => {
        assertAllowedKeys(media, ["image", "audio"]);
        return {};
      })(),
      image: (() => {
        const image = parseRecord(media.image);
        if (!image) return null;
        if (typeof image.mediaKey !== "string" || typeof image.url !== "string" || typeof image.mediaRole !== "string") fail("ARRANGE_SYLLABLES_UNSUPPORTED_FIELD");
        return {
          mediaKey: image.mediaKey,
          url: image.url,
          mimeType: typeof image.mimeType === "string" || image.mimeType === null ? image.mimeType : null,
          originalName: typeof image.originalName === "string" || image.originalName === null ? image.originalName : null,
          mediaRole: image.mediaRole === "PRIMARY_IMAGE" || image.mediaRole === "REFERENCE_AUDIO" ? image.mediaRole : fail("ARRANGE_SYLLABLES_UNSUPPORTED_FIELD"),
          altText: typeof image.altText === "string" || image.altText === null ? image.altText : null,
        };
      })(),
      audio: (() => {
        const audio = parseRecord(media.audio);
        if (!audio) return null;
        if (typeof audio.mediaKey !== "string" || typeof audio.url !== "string" || typeof audio.mediaRole !== "string") fail("ARRANGE_SYLLABLES_UNSUPPORTED_FIELD");
        return {
          mediaKey: audio.mediaKey,
          url: audio.url,
          mimeType: typeof audio.mimeType === "string" || audio.mimeType === null ? audio.mimeType : null,
          originalName: typeof audio.originalName === "string" || audio.originalName === null ? audio.originalName : null,
          mediaRole: audio.mediaRole === "PRIMARY_IMAGE" || audio.mediaRole === "REFERENCE_AUDIO" ? audio.mediaRole : fail("ARRANGE_SYLLABLES_UNSUPPORTED_FIELD"),
          altText: typeof audio.altText === "string" || audio.altText === null ? audio.altText : null,
        };
      })(),
    } : undefined,
    showReferenceText: optionalBoolean(definition.showReferenceText, false),
    allowRetry: optionalBoolean(definition.allowRetry, true),
    clearOnRetry: optionalBoolean(definition.clearOnRetry, false),
    maximumSyllables: configuredMaximumSyllables,
  };
}

export function validateArrangeSyllablesConfiguration(value: unknown): ArrangeSyllablesConfiguration {
  if (jsonByteSize(value) > ARRANGE_SYLLABLES_MAX_BYTES) fail("ARRANGE_SYLLABLES_CONFIGURATION_TOO_LARGE");
  assertSafeJson(value);
  const configuration = asRecord(value);
  assertAllowedKeys(configuration, ["arrangeSyllables"]);
  const definition = asRecord(configuration.arrangeSyllables);
  const configuredMaximumSyllables = maximumSyllables(definition.maximumSyllables);
  const mode = definition.mode;
  const arrangeSyllables = mode === "MISSING_SYLLABLES"
    ? validateMissingDefinition(definition, configuredMaximumSyllables)
    : validateLegacyDefinition(definition, configuredMaximumSyllables);
  return { arrangeSyllables };
}

export function arrangeSyllablesPreviewConfiguration(configuration: ArrangeSyllablesConfiguration): { arrangeSyllables: ArrangeSyllablesDefinition } {
  const definition = configuration.arrangeSyllables;
  return definition.mode === "MISSING_SYLLABLES"
    ? {
        arrangeSyllables: {
          mode: "MISSING_SYLLABLES",
          interactionMode: "DRAG_TO_BLANK",
          words: definition.words.map((word) => ({
            id: word.id,
            sequence: word.sequence,
            syllables: word.syllables.map((syllable) => ({ ...syllable })),
          })),
          distractors: definition.distractors.map((distractor) => ({ ...distractor })),
          hint: definition.hint,
          showReferenceText: definition.showReferenceText,
          allowRetry: definition.allowRetry,
          clearOnRetry: definition.clearOnRetry,
          maximumSyllables: definition.maximumSyllables,
        },
      }
    : {
        arrangeSyllables: {
          mode: "ORDERED_RECONSTRUCTION",
          interactionMode: definition.interactionMode,
          targetWord: definition.targetWord,
          syllables: definition.syllables.map((syllable) => ({ ...syllable })),
          showReferenceText: definition.showReferenceText,
          showTargetSlots: definition.showTargetSlots,
          shuffleSyllables: definition.shuffleSyllables,
          allowRetry: definition.allowRetry,
          clearOnRetry: definition.clearOnRetry,
          maximumSyllables: definition.maximumSyllables,
        },
      };
}

export function arrangeSyllablesAuditSummary(configuration: ArrangeSyllablesConfiguration): { mode: ArrangeSyllablesContractMode; interactionMode: ArrangeSyllablesInteractionMode; syllableCount: number; wordCount: number; blankCount: number } {
  const definition = configuration.arrangeSyllables;
  return definition.mode === "MISSING_SYLLABLES"
    ? {
        mode: "MISSING_SYLLABLES",
        interactionMode: "DRAG_TO_BLANK",
        syllableCount: definition.words.flatMap((word) => word.syllables).length,
        wordCount: definition.words.length,
        blankCount: definition.words.flatMap((word) => word.syllables).filter((syllable) => syllable.isMissing).length,
      }
    : {
        mode: "ORDERED_RECONSTRUCTION",
        interactionMode: definition.interactionMode,
        syllableCount: definition.syllables.length,
        wordCount: 1,
        blankCount: 0,
      };
}
