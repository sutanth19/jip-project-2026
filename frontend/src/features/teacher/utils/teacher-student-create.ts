import { z } from "zod";

import type { TeacherClassListItem } from "@/features/teacher/types/teacher-class.types";
import type { TeacherStudentCreatePayload } from "@/features/teacher/types/teacher-student.types";
import { parseApiError } from "@/lib/api";

export const teacherStudentCreateFormSchema = z.object({
  fullName: z.string().trim().min(3, "Nama penuh diperlukan.").max(150, "Nama penuh terlalu panjang."),
  yearLevel: z.string().regex(/^[1-6]$/, "Sila pilih tahun."),
  classId: z.string().uuid("Sila pilih kelas asal."),
  remedialSkillId: z.string().uuid("Sila pilih kemahiran pemulihan."),
  gender: z.string().refine((value) => value === "MALE" || value === "FEMALE", "Sila pilih jantina."),
});

export type TeacherStudentCreateFormInput = z.input<typeof teacherStudentCreateFormSchema>;
export type TeacherStudentCreateValues = z.output<typeof teacherStudentCreateFormSchema>;

export type TeacherStudentCreateSubmissionError = {
  field?: keyof TeacherStudentCreateFormInput;
  message: string;
};

export const teacherStudentCreateDefaultValues: TeacherStudentCreateFormInput = {
  fullName: "",
  yearLevel: "",
  classId: "",
  remedialSkillId: "",
  gender: "",
};

export function buildTeacherStudentCreatePayload(values: TeacherStudentCreateValues): TeacherStudentCreatePayload {
  const payload: TeacherStudentCreatePayload = {
    fullName: values.fullName.trim(),
    yearLevel: Number(values.yearLevel),
    classId: values.classId,
    remedialSkillId: values.remedialSkillId,
    gender: values.gender,
  };

  return payload;
}

export function filterActiveTeacherClassesByYear(classes: TeacherClassListItem[], yearLevel: string): TeacherClassListItem[] {
  if (!yearLevel) return [];
  const parsedYear = Number(yearLevel);
  return classes.filter((item) => item.accountStatus === "ACTIVE" && item.yearLevel === parsedYear);
}

export function mapTeacherStudentCreateSubmissionError(error: unknown): TeacherStudentCreateSubmissionError {
  const parsed = parseApiError(error);

  if (parsed.code === "SCHOOL_CLASS_NOT_FOUND") {
    return { field: "classId", message: "Kelas yang dipilih tidak sah." };
  }

  if (parsed.code === "SCHOOL_CLASS_INACTIVE") {
    return { field: "classId", message: "Kelas yang dipilih tidak aktif." };
  }

  if (parsed.code === "STUDENT_CLASS_TRANSFER_INVALID" || parsed.code === "AUTH_OWNER_ACCESS_DENIED") {
    return { field: "classId", message: "Kelas yang dipilih tidak sepadan dengan tahun murid." };
  }

  if (parsed.code === "STUDENT_ID_GENERATION_FAILED") {
    return { message: "ID murid tidak dapat dijana. Sila cuba lagi." };
  }

  if (parsed.code === "AUTH_SCHOOL_CONTEXT_REQUIRED") {
    return { message: "Guru ini belum dipautkan kepada sekolah. Hubungi pentadbir untuk menetapkan sekolah." };
  }

  if (parsed.code === "REMEDIAL_SKILL_NOT_FOUND" || parsed.code === "REMEDIAL_SKILL_UNAVAILABLE") {
    return { field: "remedialSkillId", message: "Kemahiran pemulihan yang dipilih tidak sah." };
  }

  if (parsed.code === "AUTH_ROLE_FORBIDDEN" || parsed.code === "AUTH_PERMISSION_DENIED") {
    return { message: "Anda tidak mempunyai kebenaran untuk mendaftarkan murid." };
  }

  if (parsed.code === "NETWORK_ERROR" || parsed.code === "UNKNOWN_ERROR" || !parsed.message) {
    return { message: "Murid tidak dapat didaftarkan. Sila cuba lagi." };
  }

  return { message: parsed.message };
}
