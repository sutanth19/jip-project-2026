import { jsonByteSize } from "../utils/safe-json-schema.js";

export const ARRANGE_LETTERS_MAX_BYTES = 16 * 1024;
export const ARRANGE_LETTERS_MAX_DEPTH = 8;
export const ARRANGE_LETTERS_MAX_GRAPHEMES = 20;

const UNSAFE_TEXT = /(?:<\s*\/?\s*[a-z][^>]*>|javascript\s*:|\bfunction\b|\beval\s*\(|\bscript\b|\bon[a-z]+\s*=|\b(?:https?|data):\/\/)/i;
const FORBIDDEN_OBJECT_KEYS = new Set(["__proto__", "prototype", "constructor"]);
const segmenter = new Intl.Segmenter("ms-MY", { granularity: "grapheme" });

export type ArrangeLettersInteractionMode = "CLICK_ORDER" | "DRAG_ORDER" | "BOTH";

export type ArrangeLettersIssueCode =
  | "ARRANGE_LETTERS_CONFIGURATION_INVALID"
  | "ARRANGE_LETTERS_CONFIGURATION_TOO_LARGE"
  | "ARRANGE_LETTERS_CONFIGURATION_TOO_DEEP"
  | "ARRANGE_LETTERS_UNSAFE_CONTENT"
  | "ARRANGE_LETTERS_UNSUPPORTED_FIELD"
  | "ARRANGE_LETTERS_INTERACTION_MODE_INVALID"
  | "ARRANGE_LETTERS_TARGET_WORD_REQUIRED"
  | "ARRANGE_LETTERS_TARGET_WORD_TOO_LONG"
  | "ARRANGE_LETTERS_LETTER_UNITS_REQUIRED"
  | "ARRANGE_LETTERS_LETTER_UNIT_INVALID"
  | "ARRANGE_LETTERS_LETTER_UNIT_ID_DUPLICATE"
  | "ARRANGE_LETTERS_SEQUENCE_INVALID"
  | "ARRANGE_LETTERS_SEQUENCE_DUPLICATE"
  | "ARRANGE_LETTERS_SEQUENCE_ORDER_INVALID"
  | "ARRANGE_LETTERS_RECONSTRUCTION_INVALID"
  | "ARRANGE_LETTERS_MAXIMUM_LETTERS_INVALID";

export class ArrangeLettersContractError extends Error {
  constructor(readonly issues: readonly ArrangeLettersIssueCode[]) {
    super("Kontrak Arrange Letters tidak sah.");
    this.name = "ArrangeLettersContractError";
  }
}

export interface ArrangeLettersUnit {
  id: string;
  value: string;
  sequence: number;
}

export interface ArrangeLettersDefinition {
  interactionMode: ArrangeLettersInteractionMode;
  targetWord: string;
  letterUnits: ArrangeLettersUnit[];
  showReferenceText: boolean;
  showTargetSlots: boolean;
  shuffleLetters: boolean;
  preserveCase: boolean;
  allowRetry: boolean;
  clearOnRetry: boolean;
  maximumLetters: number;
}

export interface ArrangeLettersConfiguration {
  arrangeLetters: ArrangeLettersDefinition;
}

function fail(...issues: ArrangeLettersIssueCode[]): never {
  throw new ArrangeLettersContractError(issues);
}

function asRecord(value: unknown, issue: ArrangeLettersIssueCode = "ARRANGE_LETTERS_CONFIGURATION_INVALID"): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) fail(issue);
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) fail(issue);
  return value as Record<string, unknown>;
}

function assertSafeJson(value: unknown, depth = 0, seen = new WeakSet<object>()): void {
  if (depth > ARRANGE_LETTERS_MAX_DEPTH) fail("ARRANGE_LETTERS_CONFIGURATION_TOO_DEEP");
  if (value === null || typeof value === "boolean") return;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) fail("ARRANGE_LETTERS_CONFIGURATION_INVALID");
    return;
  }
  if (typeof value === "string") {
    if (UNSAFE_TEXT.test(value)) fail("ARRANGE_LETTERS_UNSAFE_CONTENT");
    return;
  }
  if (!value || typeof value !== "object" || value instanceof Date || Buffer.isBuffer(value) || seen.has(value)) {
    fail("ARRANGE_LETTERS_CONFIGURATION_INVALID");
  }
  seen.add(value);
  if (Array.isArray(value)) {
    for (const entry of value) assertSafeJson(entry, depth + 1, seen);
    return;
  }
  const record = asRecord(value);
  for (const [key, entry] of Object.entries(record)) {
    if (FORBIDDEN_OBJECT_KEYS.has(key) || UNSAFE_TEXT.test(key)) fail("ARRANGE_LETTERS_UNSAFE_CONTENT");
    assertSafeJson(entry, depth + 1, seen);
  }
}

function assertAllowedKeys(value: Record<string, unknown>, allowed: readonly string[]): void {
  for (const key of Object.keys(value)) {
    if (!allowed.includes(key)) fail("ARRANGE_LETTERS_UNSUPPORTED_FIELD");
  }
}

function safeString(value: unknown, issue: ArrangeLettersIssueCode, maximum: number): string {
  if (typeof value !== "string") fail(issue);
  const result = value.trim().normalize("NFC");
  if (!result || result.length > maximum || UNSAFE_TEXT.test(result) || result.includes("{{") || result.includes("}}")) fail(issue);
  return result;
}

function requiredBoolean(value: unknown, issue: ArrangeLettersIssueCode): boolean {
  if (typeof value !== "boolean") fail(issue);
  return value;
}

function optionalBoolean(value: unknown, fallback: boolean): boolean {
  if (value === undefined) return fallback;
  return requiredBoolean(value, "ARRANGE_LETTERS_CONFIGURATION_INVALID");
}

function graphemes(value: string): string[] {
  return [...segmenter.segment(value)].map((entry) => entry.segment);
}

function parseUnit(value: unknown): ArrangeLettersUnit {
  const unit = asRecord(value, "ARRANGE_LETTERS_LETTER_UNIT_INVALID");
  assertAllowedKeys(unit, ["id", "value", "sequence"]);
  const id = safeString(unit.id, "ARRANGE_LETTERS_LETTER_UNIT_INVALID", 100);
  const letterValue = safeString(unit.value, "ARRANGE_LETTERS_LETTER_UNIT_INVALID", 100);
  if (graphemes(letterValue).length !== 1) fail("ARRANGE_LETTERS_LETTER_UNIT_INVALID");
  if (typeof unit.sequence !== "number" || !Number.isInteger(unit.sequence) || unit.sequence < 1 || unit.sequence > ARRANGE_LETTERS_MAX_GRAPHEMES) {
    fail("ARRANGE_LETTERS_SEQUENCE_INVALID");
  }
  return { id, value: letterValue, sequence: unit.sequence };
}

function maximumLetters(value: unknown): number {
  if (value === undefined) return ARRANGE_LETTERS_MAX_GRAPHEMES;
  if (typeof value !== "number" || !Number.isInteger(value) || value < 1 || value > ARRANGE_LETTERS_MAX_GRAPHEMES) {
    fail("ARRANGE_LETTERS_MAXIMUM_LETTERS_INVALID");
  }
  return value;
}

export function validateArrangeLettersConfiguration(value: unknown): ArrangeLettersConfiguration {
  if (jsonByteSize(value) > ARRANGE_LETTERS_MAX_BYTES) fail("ARRANGE_LETTERS_CONFIGURATION_TOO_LARGE");
  assertSafeJson(value);
  const configuration = asRecord(value);
  assertAllowedKeys(configuration, ["arrangeLetters"]);
  const definition = asRecord(configuration.arrangeLetters);
  assertAllowedKeys(definition, ["interactionMode", "targetWord", "letterUnits", "showReferenceText", "showTargetSlots", "shuffleLetters", "preserveCase", "allowRetry", "clearOnRetry", "maximumLetters"]);
  const interactionMode = definition.interactionMode;
  if (interactionMode !== "CLICK_ORDER" && interactionMode !== "DRAG_ORDER" && interactionMode !== "BOTH") fail("ARRANGE_LETTERS_INTERACTION_MODE_INVALID");
  const targetWord = safeString(definition.targetWord, "ARRANGE_LETTERS_TARGET_WORD_REQUIRED", 500);
  const targetGraphemes = graphemes(targetWord);
  if (targetGraphemes.length > ARRANGE_LETTERS_MAX_GRAPHEMES) fail("ARRANGE_LETTERS_TARGET_WORD_TOO_LONG");
  const configuredMaximumLetters = maximumLetters(definition.maximumLetters);
  if (targetGraphemes.length > configuredMaximumLetters) fail("ARRANGE_LETTERS_MAXIMUM_LETTERS_INVALID");
  if (!Array.isArray(definition.letterUnits) || definition.letterUnits.length === 0 || definition.letterUnits.length > configuredMaximumLetters) {
    fail("ARRANGE_LETTERS_LETTER_UNITS_REQUIRED");
  }
  const letterUnits = definition.letterUnits.map(parseUnit);
  if (new Set(letterUnits.map((unit) => unit.id)).size !== letterUnits.length) fail("ARRANGE_LETTERS_LETTER_UNIT_ID_DUPLICATE");
  if (new Set(letterUnits.map((unit) => unit.sequence)).size !== letterUnits.length) fail("ARRANGE_LETTERS_SEQUENCE_DUPLICATE");
  const orderedLetterUnits = [...letterUnits].sort((left, right) => left.sequence - right.sequence);
  if (orderedLetterUnits.some((unit, index) => unit.sequence !== index + 1)) fail("ARRANGE_LETTERS_SEQUENCE_ORDER_INVALID");
  if (orderedLetterUnits.map((unit) => unit.value).join("").normalize("NFC") !== targetWord) fail("ARRANGE_LETTERS_RECONSTRUCTION_INVALID");
  if (orderedLetterUnits.length !== targetGraphemes.length) fail("ARRANGE_LETTERS_RECONSTRUCTION_INVALID");
  return {
    arrangeLetters: {
      interactionMode,
      targetWord,
      letterUnits: orderedLetterUnits,
      showReferenceText: optionalBoolean(definition.showReferenceText, false),
      showTargetSlots: optionalBoolean(definition.showTargetSlots, true),
      shuffleLetters: optionalBoolean(definition.shuffleLetters, true),
      preserveCase: optionalBoolean(definition.preserveCase, false),
      allowRetry: optionalBoolean(definition.allowRetry, true),
      clearOnRetry: optionalBoolean(definition.clearOnRetry, false),
      maximumLetters: configuredMaximumLetters,
    },
  };
}

export function arrangeLettersPreviewConfiguration(configuration: ArrangeLettersConfiguration): { arrangeLetters: ArrangeLettersDefinition } {
  const definition = configuration.arrangeLetters;
  return {
    arrangeLetters: {
      interactionMode: definition.interactionMode,
      targetWord: definition.targetWord,
      letterUnits: definition.letterUnits.map((unit) => ({ ...unit })),
      showReferenceText: definition.showReferenceText,
      showTargetSlots: definition.showTargetSlots,
      shuffleLetters: definition.shuffleLetters,
      preserveCase: definition.preserveCase,
      allowRetry: definition.allowRetry,
      clearOnRetry: definition.clearOnRetry,
      maximumLetters: definition.maximumLetters,
    },
  };
}

export function arrangeLettersAuditSummary(configuration: ArrangeLettersConfiguration): { interactionMode: ArrangeLettersInteractionMode; letterCount: number } {
  return {
    interactionMode: configuration.arrangeLetters.interactionMode,
    letterCount: configuration.arrangeLetters.letterUnits.length,
  };
}
