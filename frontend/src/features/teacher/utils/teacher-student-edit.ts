import { z } from "zod";

import type { TeacherClassListItem } from "@/features/teacher/types/teacher-class.types";
import type { TeacherStudentDetail, TeacherStudentUpdatePayload } from "@/features/teacher/types/teacher-student.types";
import { parseApiError } from "@/lib/api";
import { teacherClassDisplayLabel } from "@/features/teacher/utils/teacher-class";

export const teacherStudentEditFormSchema = z.object({
  fullName: z.string().trim().min(3, "Nama penuh diperlukan.").max(150, "Nama penuh terlalu panjang."),
  yearLevel: z.string().regex(/^[1-6]$/, "Sila pilih tahun."),
  classId: z.string().uuid("Sila pilih kelas asal."),
  remedialSkillId: z.string().uuid("Sila pilih kemahiran pemulihan."),
  gender: z.string().refine((value) => value === "MALE" || value === "FEMALE", "Sila pilih jantina."),
}).strict();

export type TeacherStudentEditFormInput = z.input<typeof teacherStudentEditFormSchema>;
export type TeacherStudentEditFormValues = z.output<typeof teacherStudentEditFormSchema>;

export const teacherStudentEditDefaultValues = (detail: TeacherStudentDetail): TeacherStudentEditFormInput => ({
  fullName: detail.fullName,
  yearLevel: String(detail.class.yearLevel),
  classId: detail.classId,
  remedialSkillId: detail.remedialSkill?.id ?? "",
  gender: detail.gender,
});

export function buildTeacherStudentEditPayload(values: TeacherStudentEditFormValues): TeacherStudentUpdatePayload {
  return {
    fullName: values.fullName.trim(),
    yearLevel: Number(values.yearLevel),
    classId: values.classId,
    remedialSkillId: values.remedialSkillId,
    gender: values.gender,
  };
}

export function filterActiveTeacherClassesByYear(classes: TeacherClassListItem[], yearLevel: string): TeacherClassListItem[] {
  if (!yearLevel) return [];
  const parsedYear = Number(yearLevel);
  return classes.filter((item) => item.accountStatus === "ACTIVE" && item.yearLevel === parsedYear);
}

export function includeCurrentTeacherStudentClass(
  classes: TeacherClassListItem[],
  detail: TeacherStudentDetail,
): TeacherClassListItem[] {
  const currentClass = {
    id: detail.class.id,
    className: detail.class.className,
    yearLevel: detail.class.yearLevel,
    academicYear: detail.class.academicYear,
    studentCount: 0,
    accountStatus: (detail.class.accountStatus ?? "ACTIVE") as TeacherClassListItem["accountStatus"],
    teacherId: "",
    schoolId: detail.schoolId,
    createdAt: detail.createdAt,
    updatedAt: detail.updatedAt,
  } satisfies TeacherClassListItem;

  if (classes.some((item) => item.id === currentClass.id)) return classes;
  return [currentClass, ...classes];
}

export function teacherStudentEditClassLabel(item: Pick<TeacherClassListItem, "yearLevel" | "className">): string {
  return teacherClassDisplayLabel(item);
}

export function mapTeacherStudentEditSubmissionError(error: unknown): { field?: keyof TeacherStudentEditFormInput; message: string } {
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

  if (parsed.code === "AUTH_SCHOOL_CONTEXT_REQUIRED") {
    return { message: "Guru ini belum dipautkan kepada sekolah. Hubungi pentadbir untuk menetapkan sekolah." };
  }

  if (parsed.code === "REMEDIAL_SKILL_NOT_FOUND" || parsed.code === "REMEDIAL_SKILL_UNAVAILABLE") {
    return { field: "remedialSkillId", message: "Kemahiran pemulihan yang dipilih tidak sah." };
  }

  if (parsed.code === "AUTH_ROLE_FORBIDDEN" || parsed.code === "AUTH_PERMISSION_DENIED") {
    return { message: "Anda tidak mempunyai kebenaran untuk mengemas kini murid." };
  }

  if (parsed.code === "NETWORK_ERROR" || parsed.code === "UNKNOWN_ERROR" || !parsed.message) {
    return { message: "Maklumat murid tidak dapat dikemas kini. Sila cuba lagi." };
  }

  return { message: parsed.message };
}
