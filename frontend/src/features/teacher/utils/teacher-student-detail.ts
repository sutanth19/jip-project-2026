import { isRecord } from "@/features/admin/utils/record";
import type { TeacherStudentDetail, TeacherStudentDetailResponse, TeacherStudentUpdatePayload } from "@/features/teacher/types/teacher-student.types";

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function asNumber(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function normalizeParent(value: unknown): TeacherStudentDetail["parents"][number] | null {
  if (!isRecord(value)) return null;
  const id = asString(value.id);
  const fullName = asString(value.fullName);
  const relationship = asString(value.relationship);
  if (!id || !fullName || !relationship) return null;

  return {
    id,
    fullName,
    relationship,
    phone: asString(value.phone) ?? undefined,
    occupation: asString(value.occupation),
    avatar: asString(value.avatar),
  };
}

export function normalizeTeacherStudentDetailResponse(payload: unknown): TeacherStudentDetailResponse {
  if (!isRecord(payload) || !isRecord(payload.student)) {
    return { student: null };
  }

  const record = payload.student;
  const id = asString(record.id);
  const fullName = asString(record.fullName);
  const studentId = asString(record.studentId);
  const school = isRecord(record.school)
    ? {
        id: asString(record.school.id) ?? "",
        schoolCode: asString(record.school.schoolCode) ?? "",
        schoolName: asString(record.school.schoolName) ?? "",
      }
    : null;
  const classRecord = isRecord(record.class)
    ? {
        id: asString(record.class.id) ?? "",
        className: asString(record.class.className) ?? "",
        yearLevel: asNumber(record.class.yearLevel, 0),
        academicYear: asNumber(record.class.academicYear, new Date().getFullYear()),
      }
    : null;

  if (!id || !fullName || !studentId || !school || !classRecord) {
    return { student: null };
  }

  const parents = Array.isArray(record.parents)
    ? record.parents.map(normalizeParent).filter((item): item is NonNullable<typeof item> => item !== null)
    : [];

  return {
    student: {
      id,
      userId: asString(record.userId) ?? "",
      schoolId: asString(record.schoolId) ?? "",
      classId: asString(record.classId) ?? "",
      studentId,
      fullName,
      gender: record.gender === "FEMALE" ? "FEMALE" : "MALE",
      birthDate: asString(record.birthDate),
      avatar: asString(record.avatar),
      accountStatus: record.accountStatus === "PENDING" || record.accountStatus === "SUSPENDED" || record.accountStatus === "ARCHIVED" || record.accountStatus === "LOCKED" ? record.accountStatus : "ACTIVE",
      isPinChanged: record.isPinChanged === true,
      createdAt: asString(record.createdAt) ?? "",
      updatedAt: asString(record.updatedAt) ?? "",
      linkedParentCount: asNumber(record.linkedParentCount, parents.length),
      school,
      class: classRecord,
      parents,
    },
  };
}

export function buildTeacherStudentUpdatePayload(values: {
  fullName: string;
  yearLevel: string;
  classId: string;
  gender: "MALE" | "FEMALE";
}): TeacherStudentUpdatePayload {
  return {
    fullName: values.fullName.trim(),
    yearLevel: Number(values.yearLevel),
    classId: values.classId,
    gender: values.gender,
  };
}
