import { AppError } from "../errors/app-error.js";

export type SafeJsonPrimitive = string | number | boolean | null;
export type SafeJsonValue = SafeJsonPrimitive | SafeJsonValue[] | { [key: string]: SafeJsonValue };
export type SafeJsonObject = { [key: string]: SafeJsonValue };
export type SafeJsonOptions = {
  allowedUrlPaths?: readonly (readonly string[])[];
};

const MAX_SCHEMA_BYTES = 64 * 1024;
const MAX_METADATA_BYTES = 16 * 1024;
const MAX_DEPTH = 12;
const FORBIDDEN_OBJECT_KEYS = new Set(["__proto__", "prototype", "constructor"]);
const SCHEMA_FIELDS = new Set([
  "type",
  "title",
  "description",
  "properties",
  "required",
  "enum",
  "minimum",
  "maximum",
  "minLength",
  "maxLength",
  "items",
  "default",
]);
const UNSAFE_TEXT = /(?:<\s*\/?\s*[a-z][^>]*>|javascript\s*:|vbscript\s*:|file\s*:|data\s*:|\bfunction\b|\beval\s*\(|\bscript\b|\bon[a-z]+\s*=|\bhttps?:\/\/)/i;

function invalidSchema(message = "Skema templat aktiviti tidak selamat."): AppError {
  return new AppError("ACTIVITY_TEMPLATE_SCHEMA_INVALID", 400, message);
}

function invalidMetadata(): AppError {
  return new AppError("QUESTION_BANK_ITEM_NOT_EDITABLE", 400, "Metadata item bank soalan tidak selamat.");
}

function serializedSize(value: unknown): number {
  try {
    return Buffer.byteLength(JSON.stringify(value), "utf8");
  } catch {
    return Number.POSITIVE_INFINITY;
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function assertSafeText(value: string, error: () => AppError): void {
  if (UNSAFE_TEXT.test(value)) throw error();
}

function isAllowedUrlPath(path: readonly string[], allowedUrlPaths: readonly (readonly string[])[] = []): boolean {
  return allowedUrlPaths.some((allowedPath) => allowedPath.length === path.length && allowedPath.every((segment, index) => segment === path[index]));
}

function assertSafeJsonValue(
  value: unknown,
  depth: number,
  seen: WeakSet<object>,
  error: () => AppError,
  path: readonly string[] = [],
  options: SafeJsonOptions = {},
): asserts value is SafeJsonValue {
  if (depth > MAX_DEPTH) throw error();
  if (value === null || typeof value === "boolean") return;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw error();
    return;
  }
  if (typeof value === "string") {
    if (isAllowedUrlPath(path, options.allowedUrlPaths) && /^https?:\/\//i.test(value)) return;
    assertSafeText(value, error);
    return;
  }
  if (!value || typeof value !== "object" || value instanceof Date || Buffer.isBuffer(value)) {
    throw error();
  }
  if (seen.has(value)) throw error();
  seen.add(value);
  if (Array.isArray(value)) {
    value.forEach((entry) => assertSafeJsonValue(entry, depth + 1, seen, error));
    return;
  }
  if (!isPlainObject(value)) throw error();
  Object.entries(value).forEach(([key, entry]) => {
    if (FORBIDDEN_OBJECT_KEYS.has(key)) throw error();
    assertSafeText(key, error);
    assertSafeJsonValue(entry, depth + 1, seen, error, [...path, key], options);
  });
}

function assertSchemaNode(value: unknown, depth: number, seen: WeakSet<object>): void {
  if (!isPlainObject(value) || depth > MAX_DEPTH || seen.has(value)) throw invalidSchema();
  seen.add(value);
  for (const [key, entry] of Object.entries(value)) {
    if (FORBIDDEN_OBJECT_KEYS.has(key)) throw invalidSchema("Medan skema templat tidak dibenarkan.");
    if (!SCHEMA_FIELDS.has(key)) throw invalidSchema("Medan skema templat tidak dibenarkan.");
    if (key === "properties") {
      if (!isPlainObject(entry)) throw invalidSchema();
      for (const [propertyName, propertySchema] of Object.entries(entry)) {
        assertSafeText(propertyName, invalidSchema);
        assertSchemaNode(propertySchema, depth + 1, seen);
      }
      continue;
    }
    if (key === "items") {
      assertSchemaNode(entry, depth + 1, seen);
      continue;
    }
    if (key === "required") {
      if (!Array.isArray(entry) || entry.some((property) => typeof property !== "string" || !property.trim())) {
        throw invalidSchema();
      }
      entry.forEach((property) => assertSafeText(property, invalidSchema));
      continue;
    }
    if (key === "enum") {
      if (!Array.isArray(entry) || entry.some((item) => item === null || !["string", "number", "boolean"].includes(typeof item))) {
        throw invalidSchema();
      }
      entry.forEach((item) => {
        if (typeof item === "string") assertSafeText(item, invalidSchema);
      });
      continue;
    }
    if (key === "type" || key === "title" || key === "description") {
      if (typeof entry !== "string" || !entry.trim()) throw invalidSchema();
      assertSafeText(entry, invalidSchema);
      continue;
    }
    if (["minimum", "maximum", "minLength", "maxLength"].includes(key)) {
      if (typeof entry !== "number" || !Number.isFinite(entry)) throw invalidSchema();
      continue;
    }
    assertSafeJsonValue(entry, depth + 1, seen, invalidSchema);
  }
}

export function assertSafeTemplateSchema(value: unknown): asserts value is SafeJsonObject {
  if (serializedSize(value) > MAX_SCHEMA_BYTES) {
    throw invalidSchema("Skema templat melebihi had 64 KB.");
  }
  assertSchemaNode(value, 0, new WeakSet<object>());
}

export function assertSafeMetadata(value: unknown, options: SafeJsonOptions = {}): asserts value is SafeJsonValue {
  if (serializedSize(value) > MAX_METADATA_BYTES) {
    throw invalidMetadata();
  }
  assertSafeJsonValue(value, 0, new WeakSet<object>(), invalidMetadata, [], options);
}

export function jsonByteSize(value: unknown): number {
  return serializedSize(value);
}
