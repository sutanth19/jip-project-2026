import type { TeacherListResult, TeacherRecord } from "@/features/teacher/types/teacher.types";

export function isRecord(value: unknown): value is TeacherRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function text(value: unknown): string {
  if (typeof value === "string" || typeof value === "number") return String(value);
  return "—";
}

export function recordId(record: TeacherRecord): string {
  return text(record.id ?? record.classId ?? record.assignmentId ?? record.submissionId ?? record.assessmentId ?? record.evidenceId ?? record.masteryId);
}

export function recordTitle(record: TeacherRecord): string {
  return text(record.title ?? record.fullName ?? record.className ?? record.name ?? record.studentId ?? record.code ?? record.id);
}

export function normalizeList(payload: unknown, keys: readonly string[]): TeacherListResult {
  if (Array.isArray(payload)) return { records: payload.filter(isRecord), pagination: null };
  if (!isRecord(payload)) return { records: [], pagination: null };
  const values = keys.flatMap((key) => Array.isArray(payload[key]) ? payload[key] : []);
  const pagination = isRecord(payload.pagination)
    ? { page: Number(payload.pagination.page ?? 1), limit: Number(payload.pagination.limit ?? values.length), total: Number(payload.pagination.total ?? values.length), totalPages: typeof payload.pagination.totalPages === "number" ? payload.pagination.totalPages : undefined }
    : null;
  return { records: values.filter(isRecord), pagination };
}

const sensitive = /password|pin|token|secret|key$|hash|correctanswer|audit|filesystem|path/i;
export function safeEntries(record: TeacherRecord): [string, unknown][] {
  return Object.entries(record).filter(([key]) => !sensitive.test(key));
}
