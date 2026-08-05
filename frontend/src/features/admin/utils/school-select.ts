import { normalizeMediaPreviewUrl } from "@/features/admin/api/media.api";
import type { AdminRecord } from "@/features/admin/types/admin.types";

export type SchoolSelectOption = {
  id: string;
  schoolName: string;
  schoolCode: string;
  logo: string | null;
  accountStatus: string;
};

function stringOrNull(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function toSchoolSelectOption(record: AdminRecord): SchoolSelectOption | null {
  const id = stringOrNull(record.id);
  const schoolName = stringOrNull(record.schoolName);
  const schoolCode = stringOrNull(record.schoolCode);

  if (!id || !schoolName || !schoolCode) {
    return null;
  }

  const logo = stringOrNull(record.logo);

  return {
    id,
    schoolName,
    schoolCode,
    logo: logo ? normalizeMediaPreviewUrl(logo) : null,
    accountStatus: stringOrNull(record.accountStatus) ?? "ACTIVE",
  };
}
