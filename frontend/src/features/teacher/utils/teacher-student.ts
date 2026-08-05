import type {
  TeacherStudentListItem,
  TeacherStudentListQuery,
  TeacherStudentListResponse,
  TeacherStudentStatus,
} from "@/features/teacher/types/teacher-student.types";

export const teacherStudentPageSizeOptions = [10, 20, 50] as const;

export const defaultTeacherStudentQuery: TeacherStudentListQuery = {
  page: 1,
  limit: 10,
  sortBy: "fullName",
  sortOrder: "asc",
};

export const teacherStudentStatusOptions: { label: string; value: "all" | TeacherStudentStatus }[] = [
  { label: "Semua status", value: "all" },
  { label: "Aktif", value: "ACTIVE" },
  { label: "Menunggu", value: "PENDING" },
  { label: "Digantung", value: "SUSPENDED" },
  { label: "Diarkibkan", value: "ARCHIVED" },
];

export function teacherStudentResetQuery(): Partial<TeacherStudentListQuery> {
  return {
    search: undefined,
    yearLevel: undefined,
    classId: undefined,
    status: undefined,
    page: 1,
  };
}

function fallbackNumber(value: unknown, defaultValue: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : defaultValue;
}

function optionalString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function normalizeClass(value: unknown): TeacherStudentListItem["class"] {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  const id = optionalString(record.id);
  const className = optionalString(record.className);
  if (!id || !className) return null;
  return {
    id,
    className,
    yearLevel: fallbackNumber(record.yearLevel, 0),
    academicYear: fallbackNumber(record.academicYear, new Date().getFullYear()),
  };
}

export function normalizeTeacherStudentListItem(value: unknown): TeacherStudentListItem | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  const id = optionalString(record.id);
  const fullName = optionalString(record.fullName);
  if (!id || !fullName) return null;

  return {
    id,
    fullName,
    userId: optionalString(record.userId) ?? "",
    schoolId: optionalString(record.schoolId) ?? "",
    classId: optionalString(record.classId) ?? "",
    studentId: optionalString(record.studentId) ?? "",
    avatar: optionalString(record.avatar) ?? null,
    accountStatus: (record.accountStatus as TeacherStudentStatus | undefined) ?? "ACTIVE",
    remedialLevel: null,
    createdAt: optionalString(record.createdAt) ?? "",
    updatedAt: optionalString(record.updatedAt) ?? "",
    class: normalizeClass(record.class),
  };
}

function normalizePagination(record: Record<string, unknown>, fallbackTotal: number) {
  return {
    page: fallbackNumber(record.page, 1),
    limit: fallbackNumber(record.limit, fallbackTotal || 10),
    total: fallbackNumber(record.total, fallbackTotal),
    totalPages: fallbackNumber(record.totalPages, fallbackTotal > 0 ? 1 : 0),
    hasNextPage: Boolean(record.hasNextPage),
    hasPreviousPage: Boolean(record.hasPreviousPage),
  };
}

export function normalizeTeacherStudentListResponse(payload: unknown): TeacherStudentListResponse {
  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
    return {
      students: [],
      pagination: { page: 1, limit: 10, total: 0, totalPages: 0, hasNextPage: false, hasPreviousPage: false },
    };
  }

  const record = payload as Record<string, unknown>;
  const students = Array.isArray(record.students)
    ? record.students.map(normalizeTeacherStudentListItem).filter((item): item is TeacherStudentListItem => item !== null)
    : [];
  const paginationRecord = typeof record.pagination === "object" && record.pagination !== null && !Array.isArray(record.pagination)
    ? record.pagination as Record<string, unknown>
    : {};

  return {
    students,
    pagination: normalizePagination(paginationRecord, students.length),
  };
}

export function teacherStudentYearLabel(yearLevel?: number): string {
  return yearLevel && yearLevel >= 1 && yearLevel <= 6 ? `Tahun ${yearLevel}` : "Belum ditetapkan";
}

export function teacherStudentClassLabel(item: Pick<TeacherStudentListItem, "class">): string {
  if (!item.class) return "Belum ditetapkan";
  return `${item.class.yearLevel} ${item.class.className}`.trim();
}

export function teacherStudentInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const initials = words.slice(0, 2).map((word) => word[0]).join("");
  return initials.toUpperCase() || "M";
}
