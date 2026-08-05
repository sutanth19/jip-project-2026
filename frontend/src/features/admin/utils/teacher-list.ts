import { normalizeMediaPreviewUrl } from "@/features/admin/api/media.api";
import type { AdminListQuery, AdminRecord } from "@/features/admin/types/admin.types";
import { getNestedValue, getRecordId } from "@/features/admin/utils/record";

export type TeacherListItem = {
  id: string;
  teacherId: string | null;
  fullName: string;
  email: string | null;
  phone: string | null;
  avatar: string | null;
  accountStatus: string;
  isFirstLogin: boolean;
  lastLogin: string | null;
  school: {
    id: string | null;
    schoolName: string | null;
    schoolCode: string | null;
    logo: string | null;
  };
};

export const teacherStatusFilterOptions = [
  { label: "Semua status", value: "all" },
  { label: "Aktif", value: "ACTIVE" },
  { label: "Menunggu", value: "PENDING" },
  { label: "Digantung", value: "SUSPENDED" },
  { label: "Diarkibkan", value: "ARCHIVED" },
] as const;

function stringOrNull(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function normalizedMediaUrl(value: unknown): string | null {
  const url = stringOrNull(value);
  return url ? normalizeMediaPreviewUrl(url) : null;
}

export function teacherSearchPatch(value: string): AdminListQuery {
  return { search: value, page: 1 };
}

export function teacherStatusPatch(value: string): AdminListQuery {
  return { status: value === "all" ? undefined : value, page: 1 };
}

export function teacherResetPatch(): AdminListQuery {
  return { search: undefined, status: undefined, schoolId: undefined, position: undefined, page: 1 };
}

export function teacherLimitPatch(limit: number): AdminListQuery {
  return { limit, page: 1 };
}

export function setupStatusForTeacher(isFirstLogin: boolean): "WAITING" | "DONE" {
  return isFirstLogin ? "WAITING" : "DONE";
}

export function getTeacherInitials(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "G"
  );
}

export function getSchoolInitialsForTeacher(name: string | null): string {
  if (!name) return "S";
  const parts = name.replace(/\([^)]*\)/g, " ").trim().split(/\s+/).filter(Boolean);
  return parts.slice(0, 3).map((part) => part[0]?.toUpperCase()).join("") || "S";
}

export function toTeacherListItem(record: AdminRecord): TeacherListItem {
  const school = getNestedValue(record, "school");

  return {
    id: getRecordId(record),
    teacherId: stringOrNull(record.teacherId),
    fullName: stringOrNull(record.fullName) ?? "Guru",
    email: stringOrNull(record.email),
    phone: stringOrNull(record.phone),
    avatar: normalizedMediaUrl(record.avatar),
    accountStatus: stringOrNull(record.accountStatus) ?? "PENDING",
    isFirstLogin: record.isFirstLogin === true,
    lastLogin: stringOrNull(record.lastLogin),
    school: {
      id: stringOrNull(getNestedValue(record, "school.id")),
      schoolName: stringOrNull(getNestedValue(record, "school.schoolName")),
      schoolCode: stringOrNull(getNestedValue(record, "school.schoolCode")),
      logo: typeof school === "object" && school !== null ? normalizedMediaUrl(getNestedValue(record, "school.logo")) : null,
    },
  };
}
