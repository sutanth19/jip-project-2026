import { jsonByteSize } from "../utils/safe-json-schema.js";

export const ARRANGE_SYLLABLES_MAX_BYTES = 16 * 1024;
export const ARRANGE_SYLLABLES_MAX_DEPTH = 8;
export const ARRANGE_SYLLABLES_MAX_SYLLABLES = 10;

const UNSAFE_TEXT = /(?:<\s*\/?\s*[a-z][^>]*>|javascript\s*:|\bfunction\b|\beval\s*\(|\bscript\b|\bon[a-z]+\s*=|\b(?:https?|data):\/\/)/i;
const FORBIDDEN_OBJECT_KEYS = new Set(["__proto__", "prototype", "constructor"]);

export type ArrangeSyllablesInteractionMode = "CLICK_ORDER" | "DRAG_ORDER" | "BOTH";

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
  | "ARRANGE_SYLLABLES_MAXIMUM_INVALID";

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

export interface ArrangeSyllablesDefinition {
  interactionMode: ArrangeSyllablesInteractionMode;
  targetWord: string;
  syllables: ArrangeSyllable[];
  showReferenceText: boolean;
  showTargetSlots: boolean;
  shuffleSyllables: boolean;
  allowRetry: boolean;
  clearOnRetry: boolean;
  maximumSyllables: number;
}

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

function assertSafeJson(value: unknown, depth = 0, seen = new WeakSet<object>()): void {
  if (depth > ARRANGE_SYLLABLES_MAX_DEPTH) fail("ARRANGE_SYLLABLES_CONFIGURATION_TOO_DEEP");
  if (value === null || typeof value === "boolean") return;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) fail("ARRANGE_SYLLABLES_CONFIGURATION_INVALID");
    return;
  }
  if (typeof value === "string") {
    if (UNSAFE_TEXT.test(value)) fail("ARRANGE_SYLLABLES_UNSAFE_CONTENT");
    return;
  }
  if (!value || typeof value !== "object" || value instanceof Date || Buffer.isBuffer(value) || seen.has(value)) {
    fail("ARRANGE_SYLLABLES_CONFIGURATION_INVALID");
  }
  seen.add(value);
  if (Array.isArray(value)) {
    for (const entry of value) assertSafeJson(entry, depth + 1, seen);
    return;
  }
  const record = asRecord(value);
  for (const [key, entry] of Object.entries(record)) {
    if (FORBIDDEN_OBJECT_KEYS.has(key) || UNSAFE_TEXT.test(key)) fail("ARRANGE_SYLLABLES_UNSAFE_CONTENT");
    assertSafeJson(entry, depth + 1, seen);
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

function requiredBoolean(value: unknown): boolean {
  if (typeof value !== "boolean") fail("ARRANGE_SYLLABLES_CONFIGURATION_INVALID");
  return value;
}

function optionalBoolean(value: unknown, fallback: boolean): boolean {
  return value === undefined ? fallback : requiredBoolean(value);
}

function parseSyllable(value: unknown): ArrangeSyllable {
  const syllable = asRecord(value, "ARRANGE_SYLLABLE_INVALID");
  assertAllowedKeys(syllable, ["id", "value", "sequence"]);
  const id = safeString(syllable.id, "ARRANGE_SYLLABLE_INVALID", 100);
  const syllableValue = safeString(syllable.value, "ARRANGE_SYLLABLE_INVALID", 500);
  if (typeof syllable.sequence !== "number" || !Number.isInteger(syllable.sequence) || syllable.sequence < 1 || syllable.sequence > ARRANGE_SYLLABLES_MAX_SYLLABLES) {
    fail("ARRANGE_SYLLABLE_SEQUENCE_INVALID");
  }
  return { id, value: syllableValue, sequence: syllable.sequence };
}

function maximumSyllables(value: unknown): number {
  if (value === undefined) return ARRANGE_SYLLABLES_MAX_SYLLABLES;
  if (typeof value !== "number" || !Number.isInteger(value) || value < 1 || value > ARRANGE_SYLLABLES_MAX_SYLLABLES) {
    fail("ARRANGE_SYLLABLES_MAXIMUM_INVALID");
  }
  return value;
}

export function validateArrangeSyllablesConfiguration(value: unknown): ArrangeSyllablesConfiguration {
  if (jsonByteSize(value) > ARRANGE_SYLLABLES_MAX_BYTES) fail("ARRANGE_SYLLABLES_CONFIGURATION_TOO_LARGE");
  assertSafeJson(value);
  const configuration = asRecord(value);
  assertAllowedKeys(configuration, ["arrangeSyllables"]);
  const definition = asRecord(configuration.arrangeSyllables);
  assertAllowedKeys(definition, ["interactionMode", "targetWord", "syllables", "showReferenceText", "showTargetSlots", "shuffleSyllables", "allowRetry", "clearOnRetry", "maximumSyllables"]);
  const interactionMode = definition.interactionMode;
  if (interactionMode !== "CLICK_ORDER" && interactionMode !== "DRAG_ORDER" && interactionMode !== "BOTH") fail("ARRANGE_SYLLABLES_INTERACTION_MODE_INVALID");
  const targetWord = safeString(definition.targetWord, "ARRANGE_SYLLABLES_TARGET_WORD_REQUIRED", 2_000);
  const configuredMaximumSyllables = maximumSyllables(definition.maximumSyllables);
  if (!Array.isArray(definition.syllables) || definition.syllables.length === 0 || definition.syllables.length > configuredMaximumSyllables) {
    fail("ARRANGE_SYLLABLES_REQUIRED");
  }
  const syllables = definition.syllables.map(parseSyllable);
  if (new Set(syllables.map((syllable) => syllable.id)).size !== syllables.length) fail("ARRANGE_SYLLABLE_ID_DUPLICATE");
  if (new Set(syllables.map((syllable) => syllable.sequence)).size !== syllables.length) fail("ARRANGE_SYLLABLE_SEQUENCE_DUPLICATE");
  const orderedSyllables = [...syllables].sort((left, right) => left.sequence - right.sequence);
  if (orderedSyllables.some((syllable, index) => syllable.sequence !== index + 1)) fail("ARRANGE_SYLLABLE_SEQUENCE_ORDER_INVALID");
  if (orderedSyllables.map((syllable) => syllable.value).join("").normalize("NFC") !== targetWord) fail("ARRANGE_SYLLABLE_RECONSTRUCTION_INVALID");
  return {
    arrangeSyllables: {
      interactionMode,
      targetWord,
      syllables: orderedSyllables,
      showReferenceText: optionalBoolean(definition.showReferenceText, false),
      showTargetSlots: optionalBoolean(definition.showTargetSlots, true),
      shuffleSyllables: optionalBoolean(definition.shuffleSyllables, true),
      allowRetry: optionalBoolean(definition.allowRetry, true),
      clearOnRetry: optionalBoolean(definition.clearOnRetry, false),
      maximumSyllables: configuredMaximumSyllables,
    },
  };
}

export function arrangeSyllablesPreviewConfiguration(configuration: ArrangeSyllablesConfiguration): { arrangeSyllables: ArrangeSyllablesDefinition } {
  const definition = configuration.arrangeSyllables;
  return {
    arrangeSyllables: {
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

export function arrangeSyllablesAuditSummary(configuration: ArrangeSyllablesConfiguration): { interactionMode: ArrangeSyllablesInteractionMode; syllableCount: number } {
  return {
    interactionMode: configuration.arrangeSyllables.interactionMode,
    syllableCount: configuration.arrangeSyllables.syllables.length,
  };
}
