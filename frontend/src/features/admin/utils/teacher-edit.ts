import { z } from "zod";

import { isValidMalaysianPhone, normalizeMalaysianPhone } from "@/features/admin/utils/admin-account-edit";
import type { TeacherDetail } from "@/features/admin/utils/teacher-detail";
import { parseApiError } from "@/lib/api";

export type TeacherEditFieldName = "schoolId" | "fullName" | "email" | "phone";

export type TeacherEditValues = {
  schoolId: string;
  fullName: string;
  email: string;
  phone: string;
};

export type TeacherUpdatePayload = Partial<{
  schoolId: string;
  fullName: string;
  email: string;
  phone: string | null;
}>;

export type TeacherEditDirtyFields = Partial<Record<TeacherEditFieldName, boolean>>;

export type TeacherEditSubmissionError = {
  field?: TeacherEditFieldName;
  message: string;
};

export const teacherEditFieldLabels: Record<TeacherEditFieldName, string> = {
  schoolId: "Sekolah",
  fullName: "Nama Penuh",
  email: "E-mel",
  phone: "Nombor Telefon",
};

const phoneSchema = z
  .string()
  .trim()
  .refine((value) => value === "" || isValidMalaysianPhone(value), {
    message: "Sila masukkan nombor telefon yang sah.",
  });

export const teacherEditFormSchema = z.object({
  schoolId: z.string().uuid("Sila pilih sekolah."),
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

function optionalString(value: string | null | undefined): string {
  return value ?? "";
}

function displayEditValue(value: string | null | undefined): string {
  return value && value.trim() ? value.trim() : "Tidak tersedia";
}

function normalizeOptionalPhone(value: string): string | null {
  const trimmed = value.trim();
  return trimmed ? normalizeMalaysianPhone(trimmed) : null;
}

export function getTeacherEditDefaultValues(detail: TeacherDetail): TeacherEditValues {
  return {
    schoolId: detail.school?.id ?? "",
    fullName: detail.fullName,
    email: optionalString(detail.email),
    phone: optionalString(detail.phone),
  };
}

export function isTeacherEditSaveEnabled({
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

export function buildTeacherUpdatePayload(
  values: TeacherEditValues,
  dirtyFields: TeacherEditDirtyFields,
  defaults: TeacherEditValues,
): TeacherUpdatePayload {
  const payload: TeacherUpdatePayload = {};
  const nextFullName = values.fullName.trim();
  const nextEmail = values.email.trim().toLowerCase();
  const originalEmail = defaults.email.trim().toLowerCase();
  const nextPhone = normalizeOptionalPhone(values.phone);
  const originalPhone = normalizeOptionalPhone(defaults.phone);

  if (dirtyFields.schoolId && values.schoolId !== defaults.schoolId) {
    payload.schoolId = values.schoolId;
  }

  if (dirtyFields.fullName && nextFullName !== defaults.fullName.trim()) {
    payload.fullName = nextFullName;
  }

  if (dirtyFields.email && nextEmail !== originalEmail) {
    payload.email = nextEmail;
  }

  if (dirtyFields.phone && nextPhone !== originalPhone) {
    payload.phone = nextPhone;
  }

  return payload;
}

export function getTeacherEditChangedFieldSummary({
  payload,
  values,
  defaults,
  schoolNames,
}: {
  payload: TeacherUpdatePayload;
  values: TeacherEditValues;
  defaults: TeacherEditValues;
  schoolNames: Record<string, string | undefined>;
}) {
  const fieldNames: TeacherEditFieldName[] = ["schoolId", "fullName", "email", "phone"];

  return fieldNames
    .filter((name) => Object.prototype.hasOwnProperty.call(payload, name))
    .map((name) => {
      if (name === "schoolId") {
        return {
          name,
          label: teacherEditFieldLabels[name],
          before: displayEditValue(schoolNames[defaults.schoolId]),
          after: displayEditValue(schoolNames[values.schoolId]),
        };
      }

      return {
        name,
        label: teacherEditFieldLabels[name],
        before: displayEditValue(defaults[name]),
        after: displayEditValue(name === "phone" ? payload.phone : values[name]),
      };
    });
}

export function mapTeacherEditSubmissionError(error: unknown): TeacherEditSubmissionError {
  const parsed = parseApiError(error);

  if (parsed.code === "TEACHER_EMAIL_EXISTS" || parsed.code === "TEACHER_CONFLICT") {
    return { field: "email", message: "E-mel ini telah digunakan oleh akaun lain." };
  }

  if (parsed.code === "TEACHER_PHONE_EXISTS") {
    return { field: "phone", message: "Nombor telefon ini telah digunakan oleh akaun lain." };
  }

  if (parsed.code === "SCHOOL_NOT_FOUND") {
    return { field: "schoolId", message: "Sekolah yang dipilih tidak sah." };
  }

  if (parsed.code === "TEACHER_SCHOOL_INACTIVE") {
    return { field: "schoolId", message: "Sekolah yang dipilih tidak aktif." };
  }

  if (parsed.code === "TEACHER_ID_EXISTS") {
    return { field: "schoolId", message: "ID guru ini telah digunakan di sekolah yang dipilih." };
  }

  if (parsed.code === "TEACHER_NOT_FOUND") {
    return { message: "Guru tidak ditemui." };
  }

  if (parsed.code === "AUTH_ROLE_FORBIDDEN" || parsed.code === "AUTH_PERMISSION_DENIED") {
    return { message: "Anda tidak mempunyai kebenaran untuk mengemas kini akaun guru." };
  }

  if (parsed.code === "NETWORK_ERROR" || parsed.code === "UNKNOWN_ERROR" || !parsed.message) {
    return { message: "Maklumat guru tidak dapat dikemas kini. Sila cuba lagi." };
  }

  return { message: parsed.message };
}
