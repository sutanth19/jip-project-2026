import { assertSafeStorageKey } from "../storage/local-storage.adapter.js";
import { jsonByteSize } from "../utils/safe-json-schema.js";

export const FILL_BLANK_MAX_BYTES = 16 * 1024;
export const FILL_BLANK_MAX_DEPTH = 8;

const MAX_BLANKS = 50;
const MAX_WORD_BANK_ENTRIES = 100;
const MAX_ACCEPTABLE_ANSWERS = 50;
const UNSAFE_TEXT = /(?:<\s*\/?\s*[a-z][^>]*>|javascript\s*:|\bfunction\b|\beval\s*\(|\bscript\b|\bon[a-z]+\s*=|\b(?:https?|data):\/\/)/i;
const MARKER = /^\{\{blank:([1-9]\d*)\}\}$/u;
const EXPRESSION = /\{\{[^{}]*\}\}/gu;
const FORBIDDEN_OBJECT_KEYS = new Set(["__proto__", "prototype", "constructor"]);
const LOCAL_PATH_TEXT = /(?:^\/|^[A-Za-z]:[\\/]|(?:^|[\\/])(?:private|tmp|var|users)(?:[\\/]|$))/iu;

export type FillBlankMode = "TYPING" | "WORD_BANK" | "MIXED";
export type FillBlankInputMode = "TYPING" | "WORD_BANK";

export type FillBlankIssueCode =
  | "FILL_BLANK_CONFIGURATION_INVALID"
  | "FILL_BLANK_CONFIGURATION_TOO_LARGE"
  | "FILL_BLANK_CONFIGURATION_TOO_DEEP"
  | "FILL_BLANK_UNSAFE_CONTENT"
  | "FILL_BLANK_UNSUPPORTED_FIELD"
  | "FILL_BLANK_MODE_INVALID"
  | "FILL_BLANK_PROMPT_INVALID"
  | "FILL_BLANK_TEMPLATE_EXPRESSION_INVALID"
  | "FILL_BLANK_BLANKS_REQUIRED"
  | "FILL_BLANK_BLANK_ID_DUPLICATE"
  | "FILL_BLANK_MARKER_INVALID"
  | "FILL_BLANK_MARKER_DUPLICATE"
  | "FILL_BLANK_MARKER_UNDECLARED"
  | "FILL_BLANK_MARKER_MISSING"
  | "FILL_BLANK_MARKER_ORDER_INVALID"
  | "FILL_BLANK_INPUT_MODE_INVALID"
  | "FILL_BLANK_MODE_INPUT_MISMATCH"
  | "FILL_BLANK_ACCEPTABLE_ANSWERS_REQUIRED"
  | "FILL_BLANK_ACCEPTABLE_ANSWER_INVALID"
  | "FILL_BLANK_ACCEPTABLE_ANSWER_DUPLICATE"
  | "FILL_BLANK_HINT_INVALID"
  | "FILL_BLANK_MEDIA_KEY_INVALID"
  | "FILL_BLANK_WORD_BANK_REQUIRED"
  | "FILL_BLANK_WORD_BANK_ID_DUPLICATE"
  | "FILL_BLANK_WORD_BANK_CONTENT_INVALID"
  | "FILL_BLANK_WORD_BANK_REPEATED_WORD_DISABLED"
  | "FILL_BLANK_WORD_BANK_UNSATISFIABLE";

export class FillBlankContractError extends Error {
  constructor(readonly issues: readonly FillBlankIssueCode[]) {
    super("Kontrak Fill in the Blank tidak sah.");
    this.name = "FillBlankContractError";
  }
}

export interface FillBlankHint {
  text: string | null;
  mediaKey: string | null;
}

export interface FillBlankBlank {
  id: string;
  marker: string;
  required: boolean;
  inputMode: FillBlankInputMode;
  acceptableAnswers: string[];
  hint: FillBlankHint | null;
  placeholder: string | null;
  caseSensitive: boolean;
  trimWhitespace: boolean;
  collapseWhitespace: boolean;
  unicodeNormalization: "NFC";
}

export interface FillBlankWordBankEntry {
  id: string;
  content: string;
  mediaKey: string | null;
  singleUse: boolean;
}

export interface FillBlankDefinition {
  mode: FillBlankMode;
  prompt: string;
  blanks: FillBlankBlank[];
  wordBank: FillBlankWordBankEntry[];
  allowRepeatedWords: boolean;
  clearIncorrectOnlyOnRetry: boolean;
}

export interface FillBlankConfiguration {
  fillBlank: FillBlankDefinition;
}

export interface FillBlankPreviewMedia {
  key: string;
  url: string | null;
  mimeType: string | null;
  altText: string | null;
  label: string | null;
}

export interface FillBlankPreviewMediaDescriptor {
  url: string | null;
  mimeType?: string | null;
  altText?: string | null;
  label?: string | null;
}

function fail(...issues: FillBlankIssueCode[]): never {
  throw new FillBlankContractError(issues);
}

function asRecord(value: unknown, issue: FillBlankIssueCode = "FILL_BLANK_CONFIGURATION_INVALID"): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) fail(issue);
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) fail(issue);
  return value as Record<string, unknown>;
}

function assertSafeJson(value: unknown, depth = 0, seen = new WeakSet<object>()): void {
  if (depth > FILL_BLANK_MAX_DEPTH) fail("FILL_BLANK_CONFIGURATION_TOO_DEEP");
  if (value === null || typeof value === "boolean") return;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) fail("FILL_BLANK_CONFIGURATION_INVALID");
    return;
  }
  if (typeof value === "string") {
    if (UNSAFE_TEXT.test(value)) fail("FILL_BLANK_UNSAFE_CONTENT");
    return;
  }
  if (!value || typeof value !== "object" || value instanceof Date || Buffer.isBuffer(value) || seen.has(value)) {
    fail("FILL_BLANK_CONFIGURATION_INVALID");
  }
  seen.add(value);
  if (Array.isArray(value)) {
    for (const entry of value) assertSafeJson(entry, depth + 1, seen);
    return;
  }
  const record = asRecord(value);
  for (const [key, entry] of Object.entries(record)) {
    if (FORBIDDEN_OBJECT_KEYS.has(key) || UNSAFE_TEXT.test(key)) fail("FILL_BLANK_UNSAFE_CONTENT");
    assertSafeJson(entry, depth + 1, seen);
  }
}

function assertAllowedKeys(value: Record<string, unknown>, allowed: readonly string[]): void {
  for (const key of Object.keys(value)) {
    if (!allowed.includes(key)) fail("FILL_BLANK_UNSUPPORTED_FIELD");
  }
}

function requiredString(value: unknown, issue: FillBlankIssueCode, maximum: number): string {
  if (typeof value !== "string") fail(issue);
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > maximum || UNSAFE_TEXT.test(trimmed) || trimmed.includes("{{") || trimmed.includes("}}")) fail(issue);
  return trimmed;
}

function optionalString(value: unknown, issue: FillBlankIssueCode, maximum: number): string | null {
  if (value === undefined || value === null) return null;
  return requiredString(value, issue, maximum);
}

function requiredBoolean(value: unknown, issue: FillBlankIssueCode): boolean {
  if (typeof value !== "boolean") fail(issue);
  return value;
}

function optionalBoolean(value: unknown, fallback: boolean, issue: FillBlankIssueCode): boolean {
  if (value === undefined) return fallback;
  return requiredBoolean(value, issue);
}

function mediaKey(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string" || value !== value.trim() || value.length > 512) fail("FILL_BLANK_MEDIA_KEY_INVALID");
  try {
    assertSafeStorageKey(value);
  } catch {
    fail("FILL_BLANK_MEDIA_KEY_INVALID");
  }
  return value;
}

function prompt(value: unknown): string {
  if (typeof value !== "string") fail("FILL_BLANK_PROMPT_INVALID");
  const result = value.trim();
  if (!result || result.length > 10_000 || UNSAFE_TEXT.test(result)) fail("FILL_BLANK_PROMPT_INVALID");
  const expressions = [...result.matchAll(EXPRESSION)].map((match) => match[0]);
  const remainingBraces = result.replace(EXPRESSION, "");
  if (expressions.some((expression) => !MARKER.test(expression)) || remainingBraces.includes("{{") || remainingBraces.includes("}}")) {
    fail("FILL_BLANK_TEMPLATE_EXPRESSION_INVALID");
  }
  return result;
}

function normalise(value: string, blank: Pick<FillBlankBlank, "caseSensitive" | "trimWhitespace" | "collapseWhitespace" | "unicodeNormalization">): string {
  let result = value.normalize(blank.unicodeNormalization);
  if (blank.trimWhitespace) result = result.trim();
  if (blank.collapseWhitespace) result = result.replace(/\s+/gu, " ");
  return blank.caseSensitive ? result : result.toLowerCase();
}

function parseHint(value: unknown): FillBlankHint | null {
  if (value === undefined || value === null) return null;
  const hint = asRecord(value, "FILL_BLANK_HINT_INVALID");
  assertAllowedKeys(hint, ["text", "mediaKey"]);
  const text = optionalString(hint.text, "FILL_BLANK_HINT_INVALID", 1_000);
  const key = mediaKey(hint.mediaKey);
  if (text === null && key === null) fail("FILL_BLANK_HINT_INVALID");
  return { text, mediaKey: key };
}

function parseBlank(value: unknown): FillBlankBlank {
  const blank = asRecord(value, "FILL_BLANK_BLANKS_REQUIRED");
  assertAllowedKeys(blank, ["id", "marker", "required", "inputMode", "acceptableAnswers", "hint", "placeholder", "caseSensitive", "trimWhitespace", "collapseWhitespace", "unicodeNormalization"]);
  const id = requiredString(blank.id, "FILL_BLANK_BLANKS_REQUIRED", 100);
  if (typeof blank.marker !== "string" || blank.marker.length > 32 || UNSAFE_TEXT.test(blank.marker)) fail("FILL_BLANK_MARKER_INVALID");
  const marker = blank.marker;
  if (!MARKER.test(marker)) fail("FILL_BLANK_MARKER_INVALID");
  const required = requiredBoolean(blank.required, "FILL_BLANK_BLANKS_REQUIRED");
  const inputMode = blank.inputMode;
  if (inputMode !== "TYPING" && inputMode !== "WORD_BANK") fail("FILL_BLANK_INPUT_MODE_INVALID");
  const caseSensitive = optionalBoolean(blank.caseSensitive, false, "FILL_BLANK_BLANKS_REQUIRED");
  const trimWhitespace = optionalBoolean(blank.trimWhitespace, true, "FILL_BLANK_BLANKS_REQUIRED");
  const collapseWhitespace = optionalBoolean(blank.collapseWhitespace, true, "FILL_BLANK_BLANKS_REQUIRED");
  if (blank.unicodeNormalization !== undefined && blank.unicodeNormalization !== "NFC") fail("FILL_BLANK_BLANKS_REQUIRED");
  const result: FillBlankBlank = {
    id,
    marker,
    required,
    inputMode,
    acceptableAnswers: [],
    hint: parseHint(blank.hint),
    placeholder: optionalString(blank.placeholder, "FILL_BLANK_BLANKS_REQUIRED", 255),
    caseSensitive,
    trimWhitespace,
    collapseWhitespace,
    unicodeNormalization: "NFC",
  };
  if (!Array.isArray(blank.acceptableAnswers) || blank.acceptableAnswers.length === 0 || blank.acceptableAnswers.length > MAX_ACCEPTABLE_ANSWERS) {
    fail("FILL_BLANK_ACCEPTABLE_ANSWERS_REQUIRED");
  }
  const answers = blank.acceptableAnswers.map((answer) => requiredString(answer, "FILL_BLANK_ACCEPTABLE_ANSWER_INVALID", 500));
  const normalisedAnswers = new Set<string>();
  for (const answer of answers) {
    const normalised = normalise(answer, result);
    if (!normalised) fail("FILL_BLANK_ACCEPTABLE_ANSWER_INVALID");
    if (normalisedAnswers.has(normalised)) fail("FILL_BLANK_ACCEPTABLE_ANSWER_DUPLICATE");
    normalisedAnswers.add(normalised);
  }
  result.acceptableAnswers = answers;
  return result;
}

function parseWordBankEntry(value: unknown): FillBlankWordBankEntry {
  const entry = asRecord(value, "FILL_BLANK_WORD_BANK_CONTENT_INVALID");
  assertAllowedKeys(entry, ["id", "content", "mediaKey", "singleUse"]);
  return {
    id: requiredString(entry.id, "FILL_BLANK_WORD_BANK_CONTENT_INVALID", 100),
    content: requiredString(entry.content, "FILL_BLANK_WORD_BANK_CONTENT_INVALID", 500),
    mediaKey: mediaKey(entry.mediaKey),
    singleUse: requiredBoolean(entry.singleUse, "FILL_BLANK_WORD_BANK_CONTENT_INVALID"),
  };
}

function promptMarkers(value: string): string[] {
  return [...value.matchAll(EXPRESSION)].map((match) => match[0]);
}

function assertMatchingWordBank(blanks: FillBlankBlank[], entries: FillBlankWordBankEntry[], allowRepeatedWords: boolean): void {
  const wordBankBlanks = blanks.filter((blank) => blank.inputMode === "WORD_BANK");
  if (wordBankBlanks.length === 0) return;
  const matchingEntryIndexes = wordBankBlanks.map((blank) => entries
    .map((entry, index) => ({ entry, index }))
    .filter(({ entry }) => blank.acceptableAnswers.some((answer) => normalise(answer, blank) === normalise(entry.content, blank)))
    .map(({ index }) => index));
  if (matchingEntryIndexes.some((matches) => matches.length === 0)) fail("FILL_BLANK_WORD_BANK_UNSATISFIABLE");

  const singleUseEntryForBlank = matchingEntryIndexes.map((matches) => matches.filter((index) => entries[index]?.singleUse));
  const needsSingleUseMatch = matchingEntryIndexes.map((matches) => !allowRepeatedWords && matches.length > 0 ? true : !matches.some((index) => !entries[index]?.singleUse));
  const assignedBlankByEntry = new Map<number, number>();
  const assign = (blankIndex: number, visited: Set<number>): boolean => {
    for (const entryIndex of singleUseEntryForBlank[blankIndex] ?? []) {
      if (visited.has(entryIndex)) continue;
      visited.add(entryIndex);
      const assigned = assignedBlankByEntry.get(entryIndex);
      if (assigned === undefined || assign(assigned, visited)) {
        assignedBlankByEntry.set(entryIndex, blankIndex);
        return true;
      }
    }
    return false;
  };
  for (let index = 0; index < wordBankBlanks.length; index += 1) {
    if (needsSingleUseMatch[index] && !assign(index, new Set<number>())) fail("FILL_BLANK_WORD_BANK_UNSATISFIABLE");
  }
}

export function validateFillBlankConfiguration(value: unknown): FillBlankConfiguration {
  if (jsonByteSize(value) > FILL_BLANK_MAX_BYTES) fail("FILL_BLANK_CONFIGURATION_TOO_LARGE");
  assertSafeJson(value);
  const configuration = asRecord(value);
  assertAllowedKeys(configuration, ["fillBlank"]);
  const definition = asRecord(configuration.fillBlank);
  assertAllowedKeys(definition, ["mode", "prompt", "blanks", "wordBank", "allowRepeatedWords", "clearIncorrectOnlyOnRetry"]);
  const mode = definition.mode;
  if (mode !== "TYPING" && mode !== "WORD_BANK" && mode !== "MIXED") fail("FILL_BLANK_MODE_INVALID");
  const promptText = prompt(definition.prompt);
  if (!Array.isArray(definition.blanks) || definition.blanks.length === 0 || definition.blanks.length > MAX_BLANKS) fail("FILL_BLANK_BLANKS_REQUIRED");
  const blanks = definition.blanks.map(parseBlank);
  if (new Set(blanks.map((blank) => blank.id)).size !== blanks.length) fail("FILL_BLANK_BLANK_ID_DUPLICATE");
  if (new Set(blanks.map((blank) => blank.marker)).size !== blanks.length) fail("FILL_BLANK_MARKER_DUPLICATE");
  const markers = promptMarkers(promptText);
  if (markers.some((marker) => !blanks.some((blank) => blank.marker === marker))) fail("FILL_BLANK_MARKER_UNDECLARED");
  if (blanks.some((blank) => markers.filter((marker) => marker === blank.marker).length === 0)) fail("FILL_BLANK_MARKER_MISSING");
  if (markers.some((marker) => markers.filter((candidate) => candidate === marker).length !== 1)) fail("FILL_BLANK_MARKER_DUPLICATE");
  if (markers.length !== blanks.length || markers.some((marker, index) => marker !== blanks[index]?.marker)) fail("FILL_BLANK_MARKER_ORDER_INVALID");
  const inputModes = new Set(blanks.map((blank) => blank.inputMode));
  if ((mode === "TYPING" && (inputModes.size !== 1 || !inputModes.has("TYPING"))) || (mode === "WORD_BANK" && (inputModes.size !== 1 || !inputModes.has("WORD_BANK"))) || (mode === "MIXED" && (!inputModes.has("TYPING") || !inputModes.has("WORD_BANK")))) {
    fail("FILL_BLANK_MODE_INPUT_MISMATCH");
  }
  if (!Array.isArray(definition.wordBank) || definition.wordBank.length > MAX_WORD_BANK_ENTRIES) fail("FILL_BLANK_WORD_BANK_REQUIRED");
  const wordBank = definition.wordBank.map(parseWordBankEntry);
  if (new Set(wordBank.map((entry) => entry.id)).size !== wordBank.length) fail("FILL_BLANK_WORD_BANK_ID_DUPLICATE");
  const allowRepeatedWords = requiredBoolean(definition.allowRepeatedWords, "FILL_BLANK_WORD_BANK_CONTENT_INVALID");
  if ((mode === "WORD_BANK" || mode === "MIXED") && wordBank.length === 0) fail("FILL_BLANK_WORD_BANK_REQUIRED");
  if (mode === "TYPING" && wordBank.length > 0) fail("FILL_BLANK_MODE_INPUT_MISMATCH");
  if (!allowRepeatedWords) {
    const contents = new Set<string>();
    for (const entry of wordBank) {
      if (!entry.singleUse) fail("FILL_BLANK_WORD_BANK_REPEATED_WORD_DISABLED");
      const content = entry.content.normalize("NFC").trim().replace(/\s+/gu, " ").toLowerCase();
      if (contents.has(content)) fail("FILL_BLANK_WORD_BANK_REPEATED_WORD_DISABLED");
      contents.add(content);
    }
  }
  assertMatchingWordBank(blanks, wordBank, allowRepeatedWords);
  return {
    fillBlank: {
      mode,
      prompt: promptText,
      blanks,
      wordBank,
      allowRepeatedWords,
      clearIncorrectOnlyOnRetry: optionalBoolean(definition.clearIncorrectOnlyOnRetry, true, "FILL_BLANK_CONFIGURATION_INVALID"),
    },
  };
}

export async function validateFillBlankMedia(
  configuration: FillBlankConfiguration,
  assertMediaExists: (key: string) => Promise<void>,
): Promise<void> {
  const keys = new Set<string>();
  for (const blank of configuration.fillBlank.blanks) if (blank.hint?.mediaKey) keys.add(blank.hint.mediaKey);
  for (const entry of configuration.fillBlank.wordBank) if (entry.mediaKey) keys.add(entry.mediaKey);
  for (const key of keys) {
    try {
      await assertMediaExists(key);
    } catch {
      fail("FILL_BLANK_MEDIA_KEY_INVALID");
    }
  }
}

export function fillBlankMediaKeys(configuration: FillBlankConfiguration): string[] {
  const keys = new Set<string>();
  for (const blank of configuration.fillBlank.blanks) if (blank.hint?.mediaKey) keys.add(blank.hint.mediaKey);
  for (const entry of configuration.fillBlank.wordBank) if (entry.mediaKey) keys.add(entry.mediaKey);
  return [...keys];
}

function previewMedia(key: string | null, media: ReadonlyMap<string, FillBlankPreviewMediaDescriptor>): FillBlankPreviewMedia[] {
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

export function fillBlankPreviewConfiguration(
  configuration: FillBlankConfiguration,
  media: ReadonlyMap<string, FillBlankPreviewMediaDescriptor>,
): {
  fillBlank: {
    mode: FillBlankMode;
    prompt: string;
    blanks: Array<{
      id: string;
      marker: string;
      required: boolean;
      inputMode: FillBlankInputMode;
      acceptableAnswers: string[];
      hint: { text: string | null; media: FillBlankPreviewMedia[] };
      placeholder: string | null;
      caseSensitive: boolean;
      trimWhitespace: boolean;
      collapseWhitespace: boolean;
      unicodeNormalization: "NFC";
    }>;
    wordBank: Array<{ id: string; content: string; singleUse: boolean; media: FillBlankPreviewMedia[] }>;
    allowRepeatedWords: boolean;
    clearIncorrectOnlyOnRetry: boolean;
  };
} {
  const definition = configuration.fillBlank;
  return {
    fillBlank: {
      mode: definition.mode,
      prompt: definition.prompt,
      blanks: definition.blanks.map((blank) => ({
        id: blank.id,
        marker: blank.marker,
        required: blank.required,
        inputMode: blank.inputMode,
        acceptableAnswers: [...blank.acceptableAnswers],
        hint: { text: blank.hint?.text ?? null, media: previewMedia(blank.hint?.mediaKey ?? null, media) },
        placeholder: blank.placeholder,
        caseSensitive: blank.caseSensitive,
        trimWhitespace: blank.trimWhitespace,
        collapseWhitespace: blank.collapseWhitespace,
        unicodeNormalization: blank.unicodeNormalization,
      })),
      wordBank: definition.wordBank.map((entry) => ({
        id: entry.id,
        content: entry.content,
        singleUse: entry.singleUse,
        media: previewMedia(entry.mediaKey, media),
      })),
      allowRepeatedWords: definition.allowRepeatedWords,
      clearIncorrectOnlyOnRetry: definition.clearIncorrectOnlyOnRetry,
    },
  };
}

export function fillBlankAuditSummary(configuration: FillBlankConfiguration): { mode: FillBlankMode; blankCount: number; wordBankCount: number; hintCount: number } {
  return {
    mode: configuration.fillBlank.mode,
    blankCount: configuration.fillBlank.blanks.length,
    wordBankCount: configuration.fillBlank.wordBank.length,
    hintCount: configuration.fillBlank.blanks.filter((blank) => blank.hint !== null).length,
  };
}
