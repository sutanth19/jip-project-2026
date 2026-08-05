import { z } from "zod";

import {
  adminEditFieldLabels,
  isValidMalaysianPhone,
  type AdminAccountEditFieldName,
  type AdminAccountEditValues,
} from "@/features/admin/utils/admin-account-edit";
import { parseApiError } from "@/lib/api";

export type AdminAccountCreateValues = AdminAccountEditValues;

export type AdminAccountCreatePayload = {
  fullName: string;
  email: string;
  phone?: string;
};

export type AdminCreateSubmissionError = {
  field?: AdminAccountEditFieldName;
  message: string;
};

const phoneSchema = z
  .string()
  .trim()
  .refine((value) => value === "" || isValidMalaysianPhone(value), {
    message: "Sila masukkan nombor telefon yang sah.",
  });

export const adminAccountCreateFormSchema = z.object({
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

export const adminCreateDefaultValues: AdminAccountCreateValues = {
  fullName: "",
  email: "",
  phone: "",
};

export function buildAdminCreatePayload(values: AdminAccountCreateValues): AdminAccountCreatePayload {
  const payload: AdminAccountCreatePayload = {
    fullName: values.fullName.trim(),
    email: values.email.trim(),
  };
  const phone = values.phone.trim();

  if (phone) {
    payload.phone = phone;
  }

  return payload;
}

function displayCreateValue(value: string | undefined): string {
  return value && value.trim() ? value.trim() : "Tidak tersedia";
}

export function getAdminCreateSummary(values: AdminAccountCreateValues) {
  const fieldNames: AdminAccountEditFieldName[] = ["fullName", "email", "phone"];

  return fieldNames.map((name) => ({
    name,
    label: adminEditFieldLabels[name],
    value: displayCreateValue(values[name]),
  }));
}

export function isAdminCreateSubmitEnabled({
  isValid,
  isSubmitting,
}: {
  isValid: boolean;
  isSubmitting: boolean;
}): boolean {
  return isValid && !isSubmitting;
}

export function mapAdminCreateSubmissionError(error: unknown): AdminCreateSubmissionError {
  const parsed = parseApiError(error);

  if (parsed.code === "ADMIN_EMAIL_EXISTS" || parsed.code === "ADMIN_CONFLICT") {
    return {
      field: "email",
      message: "Alamat e-mel ini telah digunakan oleh akaun lain.",
    };
  }

  if (parsed.code === "AUTH_ROLE_FORBIDDEN") {
    return {
      message: "Anda tidak mempunyai kebenaran untuk mencipta akaun pentadbir.",
    };
  }

  if (parsed.code === "AUTH_PASSWORD_CHANGE_REQUIRED") {
    return {
      message: "Sila lengkapkan penukaran kata laluan sebelum mencipta akaun pentadbir.",
    };
  }

  if (parsed.code === "UNKNOWN_ERROR" || !parsed.message) {
    return {
      message: "Akaun pentadbir tidak dapat dicipta. Sila cuba sekali lagi.",
    };
  }

  return {
    message: parsed.message,
  };
}
