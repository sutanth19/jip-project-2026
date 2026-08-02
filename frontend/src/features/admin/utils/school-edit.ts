import type { FieldNamesMarkedBoolean } from "react-hook-form";

import { normalizeMalaysianPhone } from "@/features/admin/utils/admin-account-edit";
import type {
  SchoolCreateFieldName,
  SchoolCreateValues,
} from "@/features/admin/utils/school-create";
import type { SchoolDetail } from "@/features/admin/utils/school-detail";
import { parseApiError } from "@/lib/api";

export type SchoolEditValues = SchoolCreateValues;

export type SchoolUpdatePayload = Partial<{
  schoolCode: string;
  schoolName: string;
  principalName: string | null;
  address: string;
  phone: string;
  contactEmail: string | null;
  logo: string | null;
}>;

export type SchoolEditSubmissionError = {
  field?: SchoolCreateFieldName;
  message: string;
};

export const schoolEditFieldLabels: Record<SchoolCreateFieldName, string> = {
  schoolCode: "Kod Sekolah",
  schoolName: "Nama Sekolah",
  principalName: "Nama Pengetua",
  contactEmail: "E-mel Perhubungan",
  phone: "Nombor Telefon",
  address: "Alamat Sekolah",
  logo: "Logo Sekolah",
};

function nullableValue(value: string | null | undefined): string {
  return value ?? "";
}

function displayEditValue(value: string | null | undefined): string {
  return value && value.trim() ? value.trim() : "Tidak tersedia";
}

function normalizeOptionalNullable(value: string): string | null {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

export function getSchoolEditDefaultValues(detail: SchoolDetail): SchoolEditValues {
  return {
    schoolCode: detail.schoolCode,
    schoolName: detail.schoolName,
    principalName: nullableValue(detail.principalName),
    contactEmail: nullableValue(detail.contactEmail),
    phone: nullableValue(detail.phone),
    address: nullableValue(detail.address),
    logo: nullableValue(detail.logo),
  };
}

export function isSchoolEditSaveEnabled({
  isDirty,
  isValid,
  isSubmitting,
}: {
  isDirty: boolean;
  isValid: boolean;
  isSubmitting: boolean;
}): boolean {
  return isDirty && isValid && !isSubmitting;
}

export function buildSchoolUpdatePayload(
  values: SchoolEditValues,
  dirtyFields: Partial<Readonly<FieldNamesMarkedBoolean<SchoolEditValues>>>,
  defaults: SchoolEditValues,
): SchoolUpdatePayload {
  const payload: SchoolUpdatePayload = {};
  const nextValues = {
    schoolCode: values.schoolCode.trim().toUpperCase(),
    schoolName: values.schoolName.trim(),
    principalName: normalizeOptionalNullable(values.principalName),
    contactEmail: normalizeOptionalNullable(values.contactEmail)?.toLowerCase() ?? null,
    phone: normalizeMalaysianPhone(values.phone),
    address: values.address.trim(),
    logo: normalizeOptionalNullable(values.logo),
  };
  const originalValues = {
    schoolCode: defaults.schoolCode.trim().toUpperCase(),
    schoolName: defaults.schoolName.trim(),
    principalName: normalizeOptionalNullable(defaults.principalName),
    contactEmail: normalizeOptionalNullable(defaults.contactEmail)?.toLowerCase() ?? null,
    phone: normalizeMalaysianPhone(defaults.phone),
    address: defaults.address.trim(),
    logo: normalizeOptionalNullable(defaults.logo),
  };

  if (dirtyFields.schoolCode && nextValues.schoolCode !== originalValues.schoolCode) {
    payload.schoolCode = nextValues.schoolCode;
  }

  if (dirtyFields.schoolName && nextValues.schoolName !== originalValues.schoolName) {
    payload.schoolName = nextValues.schoolName;
  }

  if (dirtyFields.principalName && nextValues.principalName !== originalValues.principalName) {
    payload.principalName = nextValues.principalName;
  }

  if (dirtyFields.contactEmail && nextValues.contactEmail !== originalValues.contactEmail) {
    payload.contactEmail = nextValues.contactEmail;
  }

  if (dirtyFields.phone && nextValues.phone !== originalValues.phone) {
    payload.phone = nextValues.phone;
  }

  if (dirtyFields.address && nextValues.address !== originalValues.address) {
    payload.address = nextValues.address;
  }

  if (dirtyFields.logo && nextValues.logo !== originalValues.logo) {
    payload.logo = nextValues.logo;
  }

  return payload;
}

export function getSchoolEditChangedFieldSummary({
  payload,
  values,
  defaults,
}: {
  payload: SchoolUpdatePayload;
  values: SchoolEditValues;
  defaults: SchoolEditValues;
}) {
  const fieldNames: SchoolCreateFieldName[] = [
    "schoolCode",
    "schoolName",
    "principalName",
    "contactEmail",
    "phone",
    "address",
    "logo",
  ];

  return fieldNames
    .filter((name) => Object.prototype.hasOwnProperty.call(payload, name))
    .map((name) => {
      const after =
        name === "logo"
          ? payload.logo
            ? "Logo dikemas kini"
            : "Logo dibuang"
          : name === "principalName" || name === "contactEmail"
            ? payload[name]
            : values[name];

      return {
        name,
        label: schoolEditFieldLabels[name],
        before: name === "logo" && defaults.logo ? "Logo sedia ada" : displayEditValue(defaults[name]),
        after: displayEditValue(after),
      };
    });
}

export function mapSchoolEditSubmissionError(error: unknown): SchoolEditSubmissionError {
  const parsed = parseApiError(error);

  if (parsed.code === "SCHOOL_CODE_EXISTS") {
    return { field: "schoolCode", message: "Kod sekolah ini telah digunakan." };
  }

  if (parsed.code === "SCHOOL_NAME_EXISTS") {
    return { field: "schoolName", message: "Nama sekolah ini telah digunakan." };
  }

  if (parsed.code === "SCHOOL_EMAIL_EXISTS") {
    return {
      field: "contactEmail",
      message: "E-mel perhubungan ini telah digunakan oleh sekolah lain.",
    };
  }

  if (parsed.code === "SCHOOL_NOT_FOUND") {
    return { message: "Sekolah tidak ditemui." };
  }

  if (parsed.code === "SCHOOL_CONFLICT") {
    return { message: "Maklumat sekolah bercanggah dengan rekod sedia ada." };
  }

  if (parsed.code === "UNKNOWN_ERROR" || !parsed.message) {
    return { message: "Maklumat sekolah tidak dapat disimpan. Sila cuba sekali lagi." };
  }

  return { message: parsed.message };
}
