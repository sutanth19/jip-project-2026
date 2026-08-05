import { z } from "zod";

import type { AdminAccountDetail } from "@/features/admin/utils/admin-account-detail";
import { parseApiError } from "@/lib/api";

export type AdminAccountEditFieldName = "fullName" | "email" | "phone";

export type AdminAccountEditValues = {
  fullName: string;
  email: string;
  phone: string;
};

export type AdminAccountUpdatePayload = Partial<{
  fullName: string;
  email: string;
  phone: string | null;
}>;

export type AdminEditDirtyFields = Partial<Record<AdminAccountEditFieldName, boolean>>;

export type AdminEditSubmissionError = {
  field?: AdminAccountEditFieldName;
  message: string;
};

export const adminEditFieldLabels: Record<AdminAccountEditFieldName, string> = {
  fullName: "Nama penuh",
  email: "E-mel",
  phone: "Nombor telefon",
};

function displayEditValue(value: string | null | undefined): string {
  return value && value.trim() ? value.trim() : "Tidak tersedia";
}

const phoneSchema = z
  .string()
  .trim()
  .refine((value) => value === "" || isValidMalaysianPhone(value), {
    message: "Sila masukkan nombor telefon yang sah.",
  });

export const adminAccountEditFormSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(3, "Nama penuh diperlukan.")
    .max(150, "Nama penuh terlalu panjang."),
  email: z
    .string()
    .trim()
    .email("Sila masukkan alamat e-mel yang sah.")
    .max(254, "E-mel terlalu panjang."),
  phone: phoneSchema,
});

export function normalizeMalaysianPhone(value: string): string {
  const compact = value.trim().replace(/[\s().-]/g, "");

  if (compact.startsWith("+60")) {
    return `0${compact.slice(3)}`;
  }

  if (compact.startsWith("60")) {
    return `0${compact.slice(2)}`;
  }

  return compact;
}

export function isValidMalaysianPhone(value: string): boolean {
  return /^0(?:1\d{7,9}|[2-9]\d{7,9})$/.test(normalizeMalaysianPhone(value));
}

export function getAdminEditDefaultValues(detail: AdminAccountDetail): AdminAccountEditValues {
  return {
    fullName: detail.fullName,
    email: detail.email,
    phone: detail.phone ?? "",
  };
}

export function isAdminEditSaveEnabled({
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

export function buildAdminUpdatePayload(
  values: AdminAccountEditValues,
  dirtyFields: AdminEditDirtyFields,
  defaults: AdminAccountEditValues,
): AdminAccountUpdatePayload {
  const payload: AdminAccountUpdatePayload = {};
  const nextFullName = values.fullName.trim();
  const nextEmail = values.email.trim();
  const nextPhone = values.phone.trim() ? values.phone.trim() : null;
  const originalPhone = defaults.phone.trim() ? defaults.phone.trim() : null;

  if (dirtyFields.fullName && nextFullName !== defaults.fullName.trim()) {
    payload.fullName = nextFullName;
  }

  if (dirtyFields.email && nextEmail !== defaults.email.trim()) {
    payload.email = nextEmail;
  }

  if (dirtyFields.phone && nextPhone !== originalPhone) {
    payload.phone = nextPhone;
  }

  return payload;
}

export function getAdminEditChangedFieldSummary({
  payload,
  values,
  defaults,
}: {
  payload: AdminAccountUpdatePayload;
  values: AdminAccountEditValues;
  defaults: AdminAccountEditValues;
}) {
  const fieldNames: AdminAccountEditFieldName[] = ["fullName", "email", "phone"];

  return fieldNames
    .filter((name) => Object.prototype.hasOwnProperty.call(payload, name))
    .map((name) => ({
      name,
      label: adminEditFieldLabels[name],
      before: displayEditValue(defaults[name]),
      after: displayEditValue(name === "phone" ? payload.phone : values[name]),
    }));
}

export function mapAdminEditSubmissionError(error: unknown): AdminEditSubmissionError {
  const parsed = parseApiError(error);

  if (parsed.code === "ADMIN_EMAIL_EXISTS") {
    return {
      field: "email",
      message: "Alamat e-mel ini telah digunakan oleh akaun lain.",
    };
  }

  if (parsed.code === "UNKNOWN_ERROR" || !parsed.message) {
    return {
      message: "Maklumat tidak dapat disimpan. Sila cuba sekali lagi.",
    };
  }

  return {
    message: parsed.message,
  };
}
