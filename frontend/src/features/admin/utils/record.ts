import type { AdminRecord, PageMeta } from "@/features/admin/types/admin.types";

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function getNestedValue(record: Record<string, unknown>, path: string): unknown {
  return path.split(".").reduce<unknown>((current, key) => {
    if (!isRecord(current)) {
      return undefined;
    }

    return current[key];
  }, record);
}

export function getRecordId(record: AdminRecord): string {
  const candidates: unknown[] = [
    record.id,
    record.schoolId,
    record.adminId,
    record.teacherId,
    record.studentId,
    record.parentId,
    record.classId,
    record.assignmentId,
    record.submissionId,
    record.assessmentId,
    record.masteryId,
    record.evidenceId,
    record.outputId,
    record.auditLogId,
  ];

  const found = candidates.find((value): value is string => typeof value === "string" && value.length > 0);
  return found ?? crypto.randomUUID();
}

export function stringifyValue(value: unknown): string {
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

export function normalizeListPayload(payload: unknown): {
  items: AdminRecord[];
  meta: PageMeta;
} {
  const fallbackMeta: PageMeta = {
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  };

  if (Array.isArray(payload)) {
    return {
      items: payload.filter(isRecord) as AdminRecord[],
      meta: { ...fallbackMeta, total: payload.length },
    };
  }

  if (!isRecord(payload)) {
    return { items: [], meta: fallbackMeta };
  }

  const itemCandidates = [
    payload.items,
    payload.data,
    payload.records,
    payload.results,
    payload.notifications,
    payload.announcements,
    payload.outputs,
    payload.auditLogs,
    payload.schools,
    payload.admins,
    payload.teachers,
    payload.students,
    payload.parents,
    payload.classes,
    payload.assignments,
    payload.submissions,
    payload.assessments,
    payload.evidence,
    payload.mastery,
  ];
  const rawItems = itemCandidates.find(Array.isArray);
  const items = Array.isArray(rawItems) ? rawItems.filter(isRecord) as AdminRecord[] : [];
  const metaSource = isRecord(payload.meta)
    ? payload.meta
    : isRecord(payload.pagination)
      ? payload.pagination
      : payload;

  const page = typeof metaSource.page === "number" ? metaSource.page : fallbackMeta.page;
  const limit = typeof metaSource.limit === "number" ? metaSource.limit : fallbackMeta.limit;
  const total = typeof metaSource.total === "number" ? metaSource.total : items.length;
  const totalPages =
    typeof metaSource.totalPages === "number"
      ? metaSource.totalPages
      : Math.max(1, Math.ceil(total / Math.max(limit, 1)));

  return {
    items,
    meta: {
      page,
      limit,
      total,
      totalPages,
    },
  };
}
