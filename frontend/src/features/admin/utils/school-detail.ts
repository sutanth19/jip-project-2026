import type { AdminRecord } from "@/features/admin/types/admin.types";
import { getNestedValue } from "@/features/admin/utils/record";

export type SchoolAccountStatus = "ACTIVE" | "SUSPENDED" | "ARCHIVED";

export type SchoolDetail = {
  id: string;
  schoolCode: string;
  schoolName: string;
  logo: string | null;
  principalName: string | null;
  address: string | null;
  phone: string | null;
  contactEmail: string | null;
  accountStatus: SchoolAccountStatus;
  createdAt: string;
  updatedAt: string;
  counts: {
    admins?: number;
    teachers?: number;
    students?: number;
    classes?: number;
  };
};

function stringValue(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function schoolStatus(value: unknown): SchoolAccountStatus | null {
  return value === "ACTIVE" || value === "SUSPENDED" || value === "ARCHIVED" ? value : null;
}

function countValue(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

export function normalizeSchoolDetailRecord(record: AdminRecord | undefined): SchoolDetail | null {
  if (!record) {
    return null;
  }

  const id = stringValue(record.id);
  const schoolCode = stringValue(record.schoolCode);
  const schoolName = stringValue(record.schoolName);
  const address = stringValue(record.address);
  const phone = stringValue(record.phone);
  const accountStatus = schoolStatus(record.accountStatus);
  const createdAt = stringValue(record.createdAt);
  const updatedAt = stringValue(record.updatedAt);

  if (!id || !schoolCode || !schoolName || !accountStatus || !createdAt || !updatedAt) {
    return null;
  }

  return {
    id,
    schoolCode,
    schoolName,
    logo: stringValue(record.logo),
    principalName: stringValue(record.principalName),
    address,
    phone,
    contactEmail: stringValue(record.contactEmail),
    accountStatus,
    createdAt,
    updatedAt,
    counts: {
      admins: countValue(getNestedValue(record, "counts.admins")),
      teachers: countValue(getNestedValue(record, "counts.teachers")),
      students: countValue(getNestedValue(record, "counts.students")),
      classes: countValue(getNestedValue(record, "counts.classes")),
    },
  };
}
