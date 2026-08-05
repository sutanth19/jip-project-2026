import { z } from "zod";

import { parseApiError } from "@/lib/api";

const currentAcademicYear = new Date().getFullYear();

export type TeacherClassCreateValues = {
  yearLevel: string;
  className: string;
  academicYear: string;
};

export type TeacherClassCreatePayload = {
  yearLevel: number;
  className: string;
  academicYear: number;
};

export const teacherClassCreateFormSchema = z.object({
  yearLevel: z.string().min(1, "Sila pilih tahun."),
  className: z.string().trim().min(1, "Nama kelas diperlukan.").max(50, "Nama kelas terlalu panjang."),
  academicYear: z.string().min(1, "Sila pilih sesi akademik."),
});

export const teacherClassCreateDefaultValues: TeacherClassCreateValues = {
  yearLevel: "",
  className: "",
  academicYear: String(currentAcademicYear),
};

export function teacherClassAcademicYearOptions() {
  return Array.from({ length: 11 }, (_, index) => currentAcademicYear - 5 + index).reverse();
}

export function buildTeacherClassCreatePayload(values: TeacherClassCreateValues): TeacherClassCreatePayload {
  return {
    yearLevel: Number(values.yearLevel),
    className: values.className.trim(),
    academicYear: Number(values.academicYear),
  };
}

export function mapTeacherClassCreateSubmissionError(error: unknown): { field?: keyof TeacherClassCreateValues; message: string } {
  const parsed = parseApiError(error);

  if (parsed.code === "CLASS_ALREADY_EXISTS") {
    return { field: "className", message: "Kelas ini telah wujud bagi tahun dan sesi akademik yang dipilih." };
  }

  if (parsed.code === "AUTH_SCHOOL_CONTEXT_REQUIRED" || parsed.code === "TEACHER_CONTEXT_INVALID") {
    return { message: "Guru ini belum dipautkan kepada sekolah. Hubungi pentadbir untuk menetapkan sekolah." };
  }

  if (parsed.code === "AUTH_ROLE_FORBIDDEN") {
    return { message: "Anda tidak mempunyai kebenaran untuk mencipta kelas." };
  }

  return { message: parsed.message || "Kelas tidak dapat dicipta. Sila cuba lagi." };
}

export function mapTeacherClassEditSubmissionError(error: unknown): { field?: keyof TeacherClassCreateValues; message: string } {
  const parsed = parseApiError(error);

  if (parsed.code === "CLASS_ALREADY_EXISTS") {
    return { field: "className", message: "Kelas ini telah wujud bagi tahun dan sesi akademik yang dipilih." };
  }

  if (parsed.code === "AUTH_OWNER_ACCESS_DENIED" || parsed.code === "CLASS_NOT_FOUND") {
    return { message: "Kelas tidak ditemui atau anda tidak mempunyai kebenaran untuk mengurus rekod ini." };
  }

  if (parsed.code === "AUTH_SCHOOL_CONTEXT_REQUIRED" || parsed.code === "TEACHER_CONTEXT_INVALID") {
    return { message: "Guru ini belum dipautkan kepada sekolah. Hubungi pentadbir untuk menetapkan sekolah." };
  }

  return { message: parsed.message || "Maklumat kelas tidak dapat dikemas kini. Sila cuba lagi." };
}
