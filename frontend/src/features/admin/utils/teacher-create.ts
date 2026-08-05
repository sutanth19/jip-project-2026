import { z } from "zod";

import { isValidMalaysianPhone } from "@/features/admin/utils/admin-account-edit";
import { parseApiError } from "@/lib/api";

export type TeacherCreateValues = {
  fullName: string;
  email: string;
  phone: string;
  schoolId: string;
};

export type TeacherCreatePayload = {
  fullName: string;
  email: string;
  schoolId: string;
  phone?: string;
};

export type TeacherCreateSubmissionError = {
  field?: keyof TeacherCreateValues;
  message: string;
};

const phoneSchema = z
  .string()
  .trim()
  .refine((value) => value === "" || isValidMalaysianPhone(value), {
    message: "Sila masukkan nombor telefon yang sah.",
  });

export const teacherCreateFormSchema = z.object({
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
  schoolId: z.string().uuid("Sila pilih sekolah."),
});

export const teacherCreateDefaultValues: TeacherCreateValues = {
  fullName: "",
  email: "",
  phone: "",
  schoolId: "",
};

export function buildTeacherCreatePayload(values: TeacherCreateValues): TeacherCreatePayload {
  const payload: TeacherCreatePayload = {
    fullName: values.fullName.trim(),
    email: values.email.trim().toLowerCase(),
    schoolId: values.schoolId,
  };
  const phone = values.phone.trim();

  if (phone) {
    payload.phone = phone;
  }

  return payload;
}

export function isTeacherCreateSubmitEnabled({
  isValid,
  isSubmitting,
}: {
  isValid: boolean;
  isSubmitting: boolean;
}): boolean {
  return isValid && !isSubmitting;
}

function displayValue(value: string | undefined): string {
  return value && value.trim() ? value.trim() : "Tidak tersedia";
}

export function getTeacherCreateSummary(values: TeacherCreateValues, schoolName: string | null) {
  return [
    { name: "fullName" as const, label: "Nama Penuh", value: displayValue(values.fullName) },
    { name: "email" as const, label: "E-mel", value: displayValue(values.email) },
    { name: "phone" as const, label: "Nombor Telefon", value: displayValue(values.phone) },
    { name: "schoolId" as const, label: "Sekolah", value: schoolName ?? "Tidak tersedia" },
  ];
}

export function mapTeacherCreateSubmissionError(error: unknown): TeacherCreateSubmissionError {
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

  if (parsed.code === "AUTH_ROLE_FORBIDDEN" || parsed.code === "AUTH_PERMISSION_DENIED") {
    return { message: "Anda tidak mempunyai kebenaran untuk mencipta akaun guru." };
  }

  if (parsed.code === "NETWORK_ERROR" || parsed.code === "UNKNOWN_ERROR" || !parsed.message) {
    return { message: "Guru tidak dapat dicipta. Sila cuba lagi." };
  }

  return { message: parsed.message };
}
