import type { AdminListQuery, AdminRecord } from "@/features/admin/types/admin.types";
import { normalizeMediaPreviewUrl } from "@/features/admin/api/media.api";
import { getRecordId, stringifyValue } from "@/features/admin/utils/record";

export type SchoolStatus = "ACTIVE" | "SUSPENDED" | "ARCHIVED";

export type SchoolListItem = {
  id: string;
  schoolName: string;
  schoolCode: string;
  principalName: string | null;
  phone: string;
  contactEmail: string | null;
  logo: string | null;
  accountStatus: SchoolStatus;
  createdAt: string | null;
};

export const schoolPageSizeOptions = [10, 20, 50];

function stringOrNull(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function asSchoolStatus(value: unknown): SchoolStatus {
  return value === "SUSPENDED" || value === "ARCHIVED" ? value : "ACTIVE";
}

export function schoolSearchPatch(value: string): AdminListQuery {
  return { search: value, page: 1 };
}

export function schoolStatusPatch(value: string): AdminListQuery {
  return { status: value === "all" ? undefined : value, page: 1 };
}

export function schoolResetPatch(): AdminListQuery {
  return { search: undefined, status: undefined, page: 1 };
}

export function schoolLimitPatch(limit: number): AdminListQuery {
  return { limit, page: 1 };
}

export function toSchoolListItem(record: AdminRecord): SchoolListItem {
  const logo = stringOrNull(record.logo);

  return {
    id: getRecordId(record),
    schoolName: stringOrNull(record.schoolName) ?? "Sekolah",
    schoolCode: stringOrNull(record.schoolCode) ?? "KOD",
    principalName: stringOrNull(record.principalName),
    phone: stringifyValue(record.phone),
    contactEmail: stringOrNull(record.contactEmail),
    logo: logo ? normalizeMediaPreviewUrl(logo) : null,
    accountStatus: asSchoolStatus(record.accountStatus),
    createdAt: stringOrNull(record.createdAt),
  };
}

export function getSchoolInitials(name: string): string {
  const compact = name.replace(/\([^)]*\)/g, " ").trim();
  const parts = compact.split(/\s+/).filter(Boolean);

  if (parts.length === 1) {
    return parts[0]?.slice(0, 3).toUpperCase() || "S";
  }

  const initials = parts.slice(0, 3).map((part) => part[0]?.toUpperCase()).join("");

  return initials || "S";
}

export function schoolStatusLabel(status: SchoolStatus): string {
  if (status === "SUSPENDED") return "Digantung";
  if (status === "ARCHIVED") return "Diarkibkan";
  return "Aktif";
}
