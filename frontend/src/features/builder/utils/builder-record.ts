import type { BuilderListResult, BuilderRecord } from "@/features/builder/types/builder.types";

export function isBuilderRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function getBuilderValue(record: Record<string, unknown>, path: string): unknown {
  return path.split(".").reduce<unknown>((current, key) => {
    if (!isBuilderRecord(current)) {
      return undefined;
    }

    return current[key];
  }, record);
}

export function getBuilderRecordId(record: BuilderRecord): string {
  const candidates: unknown[] = [
    record.id,
    record.versionId,
    record.programmeId,
    record.yearId,
    record.skillId,
    record.contentStandardId,
    record.learningStandardId,
    record.objectiveId,
    record.itemId,
    record.templateId,
    record.activityId,
  ];
  const found = candidates.find((value): value is string => typeof value === "string" && value.length > 0);
  return found ?? crypto.randomUUID();
}

export function builderValueToText(value: unknown): string {
  if (value === null || value === undefined || value === "") {
    return "-";
  }

  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  if (Array.isArray(value)) {
    return `${value.length} item`;
  }

  return "Lihat butiran";
}

export function normalizeBuilderList(payload: unknown): BuilderListResult {
  const fallback = { page: 1, limit: 20, total: 0, totalPages: 1 };

  if (Array.isArray(payload)) {
    return { items: payload.filter(isBuilderRecord) as BuilderRecord[], meta: { ...fallback, total: payload.length } };
  }

  if (!isBuilderRecord(payload)) {
    return { items: [], meta: fallback };
  }

  const candidates = [
    payload.items,
    payload.versions,
    payload.subjects,
    payload.programmes,
    payload.years,
    payload.languageStructures,
    payload.remedialSkills,
    payload.contentStandards,
    payload.learningStandards,
    payload.objectives,
    payload.activities,
    payload.templates,
    payload.questionBankItems,
    payload.questions,
    payload.digitalActivities,
  ];
  const rawItems = candidates.find(Array.isArray);
  const items = Array.isArray(rawItems) ? (rawItems.filter(isBuilderRecord) as BuilderRecord[]) : [];
  const metaSource = isBuilderRecord(payload.meta)
    ? payload.meta
    : isBuilderRecord(payload.pagination)
      ? payload.pagination
      : payload;
  const page = typeof metaSource.page === "number" ? metaSource.page : fallback.page;
  const limit = typeof metaSource.limit === "number" ? metaSource.limit : fallback.limit;
  const total = typeof metaSource.total === "number" ? metaSource.total : items.length;
  const totalPages =
    typeof metaSource.totalPages === "number" ? metaSource.totalPages : Math.max(1, Math.ceil(total / Math.max(limit, 1)));

  return { items, meta: { page, limit, total, totalPages } };
}

