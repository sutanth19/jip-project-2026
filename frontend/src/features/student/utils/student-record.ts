import type { StudentList, StudentRecord } from "@/features/student/types/student.types";
export const isRecord = (value: unknown): value is StudentRecord => typeof value === "object" && value !== null && !Array.isArray(value);
export const valueText = (value: unknown): string => typeof value === "string" || typeof value === "number" ? String(value) : "—";
export const recordId = (record: StudentRecord): string => valueText(record.id ?? record.assignmentId ?? record.submissionId ?? record.assessmentId);
export function listFrom(payload: unknown, key: string): StudentList { if (!isRecord(payload)) return { records: [], pagination: null }; return { records: Array.isArray(payload[key]) ? payload[key].filter(isRecord) : [], pagination: isRecord(payload.pagination) ? payload.pagination : null }; }
const blocked = /password|pin|token|secret|hash|correctanswer|acceptableanswer|iscorrect|internalnotes|audit|path|key$/i;
export const safeEntries = (record: StudentRecord): [string, unknown][] => Object.entries(record).filter(([key]) => !blocked.test(key));
