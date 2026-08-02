import { jsonByteSize } from "../utils/safe-json-schema.js";

export const TRACING_MAX_BYTES = 16 * 1024;
export const TRACING_MAX_DEPTH = 8;
export const TRACING_MAX_UNITS = 100;

const UNSAFE_TEXT = /(?:<\s*\/?\s*[a-z][^>]*>|\b(?:javascript|vbscript|data)\s*:|\bfunction\b|\beval\s*\(|\bscript\b|\bon[a-z]+\s*=|\b[a-z][a-z0-9+.-]*:\/\/)/i;
const FORBIDDEN_OBJECT_KEYS = new Set(["__proto__", "prototype", "constructor"]);
const SVG_PATH_DATA = /^[MmZzLlHhVvCcSsQqTtAa0-9eE+\-.,\s]+$/u;

export type TracingMode = "LETTER" | "NUMBER" | "SYLLABLE" | "WORD" | "SENTENCE";
export type TracingHintType = "NONE" | "SHOW_START_POINT" | "SHOW_DIRECTION" | "SHOW_FULL_TRACE";
export type TracingGuideStyle = "DOTTED" | "SOLID";

export type TracingIssueCode =
  | "TRACING_CONFIGURATION_INVALID"
  | "TRACING_CONFIGURATION_TOO_LARGE"
  | "TRACING_CONFIGURATION_TOO_DEEP"
  | "TRACING_UNSAFE_CONTENT"
  | "TRACING_UNSUPPORTED_FIELD"
  | "TRACING_MODE_INVALID"
  | "TRACING_DISPLAY_TEXT_REQUIRED"
  | "TRACING_UNITS_REQUIRED"
  | "TRACING_UNIT_INVALID"
  | "TRACING_UNIT_ID_DUPLICATE"
  | "TRACING_SEQUENCE_INVALID"
  | "TRACING_SEQUENCE_DUPLICATE"
  | "TRACING_SEQUENCE_ORDER_INVALID"
  | "TRACING_SVG_PATH_INVALID"
  | "TRACING_CANVAS_INVALID"
  | "TRACING_GUIDE_STYLE_INVALID"
  | "TRACING_MINIMUM_ACCURACY_INVALID"
  | "TRACING_HINT_INVALID";

export class TracingContractError extends Error {
  constructor(readonly issues: readonly TracingIssueCode[]) {
    super("Kontrak Tracing tidak sah.");
    this.name = "TracingContractError";
  }
}

export interface TraceUnit {
  id: string;
  value: string;
  svgPath: string;
  sequence: number;
}

export interface TracingCanvas {
  width: number;
  height: number;
}

export interface TracingHint {
  type: TracingHintType;
}

export interface TracingDefinition {
  traceMode: TracingMode;
  displayText: string;
  traceUnits: TraceUnit[];
  canvas: TracingCanvas;
  guideStyle: TracingGuideStyle;
  showBaseline: boolean;
  showStartDots: boolean;
  showStrokeNumbers: boolean;
  showGuideArrows: boolean;
  allowRetry: boolean;
  clearOnRetry: boolean;
  minimumAccuracy: number;
  hint: TracingHint;
}

export interface TracingConfiguration {
  tracing: TracingDefinition;
}

function fail(...issues: TracingIssueCode[]): never {
  throw new TracingContractError(issues);
}

function asRecord(value: unknown, issue: TracingIssueCode = "TRACING_CONFIGURATION_INVALID"): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) fail(issue);
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) fail(issue);
  return value as Record<string, unknown>;
}

function assertSafeJson(value: unknown, depth = 0, seen = new WeakSet<object>()): void {
  if (depth > TRACING_MAX_DEPTH) fail("TRACING_CONFIGURATION_TOO_DEEP");
  if (value === null || typeof value === "boolean") return;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) fail("TRACING_CONFIGURATION_INVALID");
    return;
  }
  if (typeof value === "string") {
    if (UNSAFE_TEXT.test(value)) fail("TRACING_UNSAFE_CONTENT");
    return;
  }
  if (!value || typeof value !== "object" || value instanceof Date || Buffer.isBuffer(value) || seen.has(value)) {
    fail("TRACING_CONFIGURATION_INVALID");
  }
  seen.add(value);
  if (Array.isArray(value)) {
    for (const entry of value) assertSafeJson(entry, depth + 1, seen);
    return;
  }
  const record = asRecord(value);
  for (const [key, entry] of Object.entries(record)) {
    if (FORBIDDEN_OBJECT_KEYS.has(key) || UNSAFE_TEXT.test(key)) fail("TRACING_UNSAFE_CONTENT");
    assertSafeJson(entry, depth + 1, seen);
  }
}

function assertAllowedKeys(value: Record<string, unknown>, allowed: readonly string[]): void {
  for (const key of Object.keys(value)) {
    if (!allowed.includes(key)) fail("TRACING_UNSUPPORTED_FIELD");
  }
}

function safeString(value: unknown, issue: TracingIssueCode, maximum: number): string {
  if (typeof value !== "string") fail(issue);
  const result = value.trim().normalize("NFC");
  if (!result || result.length > maximum || UNSAFE_TEXT.test(result) || result.includes("{{") || result.includes("}}")) fail(issue);
  return result;
}

function optionalBoolean(value: unknown, fallback: boolean): boolean {
  if (value === undefined) return fallback;
  if (typeof value !== "boolean") fail("TRACING_CONFIGURATION_INVALID");
  return value;
}

function parseSvgPath(value: unknown): string {
  if (typeof value !== "string") fail("TRACING_SVG_PATH_INVALID");
  const path = value.trim();
  if (!path || path.length > 12_000 || UNSAFE_TEXT.test(path) || path.includes("{{") || path.includes("}}") || !SVG_PATH_DATA.test(path) || !/[Mm]/u.test(path)) {
    fail("TRACING_SVG_PATH_INVALID");
  }
  return path;
}

function parseTraceUnit(value: unknown): TraceUnit {
  const unit = asRecord(value, "TRACING_UNIT_INVALID");
  assertAllowedKeys(unit, ["id", "value", "svgPath", "sequence"]);
  if (typeof unit.sequence !== "number" || !Number.isInteger(unit.sequence) || unit.sequence < 1 || unit.sequence > TRACING_MAX_UNITS) fail("TRACING_SEQUENCE_INVALID");
  return {
    id: safeString(unit.id, "TRACING_UNIT_INVALID", 100),
    value: safeString(unit.value, "TRACING_UNIT_INVALID", 2_000),
    svgPath: parseSvgPath(unit.svgPath),
    sequence: unit.sequence,
  };
}

function parseCanvas(value: unknown): TracingCanvas {
  const canvas = asRecord(value, "TRACING_CANVAS_INVALID");
  assertAllowedKeys(canvas, ["width", "height"]);
  if (typeof canvas.width !== "number" || !Number.isInteger(canvas.width) || canvas.width < 200 || canvas.width > 2_400) fail("TRACING_CANVAS_INVALID");
  if (typeof canvas.height !== "number" || !Number.isInteger(canvas.height) || canvas.height < 100 || canvas.height > 1_600) fail("TRACING_CANVAS_INVALID");
  return { width: canvas.width, height: canvas.height };
}

function parseMinimumAccuracy(value: unknown): number {
  if (value === undefined) return 70;
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 100) fail("TRACING_MINIMUM_ACCURACY_INVALID");
  return value;
}

function parseHint(value: unknown): TracingHint {
  if (value === undefined || value === null) return { type: "NONE" };
  const hint = asRecord(value, "TRACING_HINT_INVALID");
  assertAllowedKeys(hint, ["type"]);
  if (hint.type !== "NONE" && hint.type !== "SHOW_START_POINT" && hint.type !== "SHOW_DIRECTION" && hint.type !== "SHOW_FULL_TRACE") fail("TRACING_HINT_INVALID");
  return { type: hint.type };
}

export function validateTracingConfiguration(value: unknown): TracingConfiguration {
  if (jsonByteSize(value) > TRACING_MAX_BYTES) fail("TRACING_CONFIGURATION_TOO_LARGE");
  assertSafeJson(value);
  const configuration = asRecord(value);
  assertAllowedKeys(configuration, ["tracing"]);
  const definition = asRecord(configuration.tracing);
  assertAllowedKeys(definition, ["traceMode", "displayText", "traceUnits", "canvas", "guideStyle", "showBaseline", "showStartDots", "showStrokeNumbers", "showGuideArrows", "allowRetry", "clearOnRetry", "minimumAccuracy", "hint"]);
  const traceMode = definition.traceMode;
  if (traceMode !== "LETTER" && traceMode !== "NUMBER" && traceMode !== "SYLLABLE" && traceMode !== "WORD" && traceMode !== "SENTENCE") fail("TRACING_MODE_INVALID");
  const displayText = safeString(definition.displayText, "TRACING_DISPLAY_TEXT_REQUIRED", 5_000);
  if (!Array.isArray(definition.traceUnits) || definition.traceUnits.length === 0 || definition.traceUnits.length > TRACING_MAX_UNITS) fail("TRACING_UNITS_REQUIRED");
  const traceUnits = definition.traceUnits.map(parseTraceUnit);
  if (new Set(traceUnits.map((unit) => unit.id)).size !== traceUnits.length) fail("TRACING_UNIT_ID_DUPLICATE");
  if (new Set(traceUnits.map((unit) => unit.sequence)).size !== traceUnits.length) fail("TRACING_SEQUENCE_DUPLICATE");
  const orderedTraceUnits = [...traceUnits].sort((left, right) => left.sequence - right.sequence);
  if (orderedTraceUnits.some((unit, index) => unit.sequence !== index + 1)) fail("TRACING_SEQUENCE_ORDER_INVALID");
  const guideStyle = definition.guideStyle === undefined ? "DOTTED" : definition.guideStyle;
  if (guideStyle !== "DOTTED" && guideStyle !== "SOLID") fail("TRACING_GUIDE_STYLE_INVALID");
  return {
    tracing: {
      traceMode,
      displayText,
      traceUnits: orderedTraceUnits,
      canvas: parseCanvas(definition.canvas),
      guideStyle,
      showBaseline: optionalBoolean(definition.showBaseline, true),
      showStartDots: optionalBoolean(definition.showStartDots, true),
      showStrokeNumbers: optionalBoolean(definition.showStrokeNumbers, false),
      showGuideArrows: optionalBoolean(definition.showGuideArrows, false),
      allowRetry: optionalBoolean(definition.allowRetry, true),
      clearOnRetry: optionalBoolean(definition.clearOnRetry, false),
      minimumAccuracy: parseMinimumAccuracy(definition.minimumAccuracy),
      hint: parseHint(definition.hint),
    },
  };
}

export function tracingPreviewConfiguration(configuration: TracingConfiguration): { tracing: TracingDefinition } {
  const definition = configuration.tracing;
  return {
    tracing: {
      traceMode: definition.traceMode,
      displayText: definition.displayText,
      traceUnits: definition.traceUnits.map((unit) => ({ ...unit })),
      canvas: { ...definition.canvas },
      guideStyle: definition.guideStyle,
      showBaseline: definition.showBaseline,
      showStartDots: definition.showStartDots,
      showStrokeNumbers: definition.showStrokeNumbers,
      showGuideArrows: definition.showGuideArrows,
      allowRetry: definition.allowRetry,
      clearOnRetry: definition.clearOnRetry,
      minimumAccuracy: definition.minimumAccuracy,
      hint: { ...definition.hint },
    },
  };
}

export function tracingAuditSummary(configuration: TracingConfiguration): { traceMode: TracingMode; traceUnitCount: number; canvasSize: TracingCanvas } {
  return {
    traceMode: configuration.tracing.traceMode,
    traceUnitCount: configuration.tracing.traceUnits.length,
    canvasSize: { ...configuration.tracing.canvas },
  };
}
