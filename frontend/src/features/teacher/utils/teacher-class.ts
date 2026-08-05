import type {
  TeacherClassDetail,
  TeacherClassDetailResponse,
  TeacherClassListItem,
  TeacherClassListQuery,
  TeacherClassListResponse,
  TeacherClassStudent,
  TeacherClassStudentsResponse,
  TeacherClassStatus,
} from "@/features/teacher/types/teacher-class.types";

export const teacherClassPageSizeOptions = [10, 20, 50] as const;

export const teacherClassStatusOptions: { label: string; value: "all" | TeacherClassStatus }[] = [
  { label: "Semua status", value: "all" },
  { label: "Aktif", value: "ACTIVE" },
  { label: "Digantung", value: "SUSPENDED" },
  { label: "Diarkibkan", value: "ARCHIVED" },
];

export const teacherYearLevelOptions = [
  { label: "Semua tahun", value: "all" },
  { label: "Tahun 1", value: "1" },
  { label: "Tahun 2", value: "2" },
  { label: "Tahun 3", value: "3" },
  { label: "Tahun 4", value: "4" },
  { label: "Tahun 5", value: "5" },
  { label: "Tahun 6", value: "6" },
] as const;

export const defaultTeacherClassQuery: TeacherClassListQuery = {
  page: 1,
  limit: 10,
  academicYear: new Date().getFullYear(),
  sortBy: "yearLevel",
  sortOrder: "asc",
};

function fallbackNumber(value: unknown, defaultValue: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : defaultValue;
}

export function normalizeTeacherClassListItem(value: unknown): TeacherClassListItem | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  if (typeof record.id !== "string" || typeof record.className !== "string") return null;

  return {
    id: record.id,
    className: record.className,
    yearLevel: fallbackNumber(record.yearLevel, 1),
    academicYear: fallbackNumber(record.academicYear, new Date().getFullYear()),
    studentCount: fallbackNumber(record.studentCount, 0),
    accountStatus: (record.accountStatus as TeacherClassStatus | undefined) ?? "ACTIVE",
    teacherId: typeof record.teacherId === "string" ? record.teacherId : "",
    schoolId: typeof record.schoolId === "string" ? record.schoolId : "",
    createdAt: typeof record.createdAt === "string" ? record.createdAt : "",
    updatedAt: typeof record.updatedAt === "string" ? record.updatedAt : "",
  };
}

export function normalizeTeacherClassListResponse(payload: unknown): TeacherClassListResponse {
  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
    return {
      classes: [],
      pagination: { page: 1, limit: 10, total: 0, totalPages: 0, hasNextPage: false, hasPreviousPage: false },
    };
  }

  const record = payload as Record<string, unknown>;
  const classes = Array.isArray(record.classes)
    ? record.classes.map(normalizeTeacherClassListItem).filter((item): item is TeacherClassListItem => item !== null)
    : [];
  const paginationRecord =
    typeof record.pagination === "object" && record.pagination !== null && !Array.isArray(record.pagination)
      ? (record.pagination as Record<string, unknown>)
      : {};

  return {
    classes,
    pagination: {
      page: fallbackNumber(paginationRecord.page, 1),
      limit: fallbackNumber(paginationRecord.limit, classes.length || 10),
      total: fallbackNumber(paginationRecord.total, classes.length),
      totalPages: fallbackNumber(paginationRecord.totalPages, classes.length > 0 ? 1 : 0),
      hasNextPage: Boolean(paginationRecord.hasNextPage),
      hasPreviousPage: Boolean(paginationRecord.hasPreviousPage),
    },
  };
}

function optionalString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
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

export function normalizeTeacherClassDetail(value: unknown): TeacherClassDetail | null {
  const item = normalizeTeacherClassListItem(value);
  if (!item || typeof value !== "object" || value === null || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  const schoolRecord = typeof record.school === "object" && record.school !== null && !Array.isArray(record.school)
    ? record.school as Record<string, unknown>
    : null;
  const teacherRecord = typeof record.teacher === "object" && record.teacher !== null && !Array.isArray(record.teacher)
    ? record.teacher as Record<string, unknown>
    : null;
  const capacitySummaryRecord = typeof record.capacitySummary === "object" && record.capacitySummary !== null && !Array.isArray(record.capacitySummary)
    ? record.capacitySummary as Record<string, unknown>
    : null;

  return {
    ...item,
    capacity: typeof record.capacity === "number" ? record.capacity : null,
    school: schoolRecord ? {
      id: optionalString(schoolRecord.id) ?? "",
      schoolCode: optionalString(schoolRecord.schoolCode) ?? "",
      schoolName: optionalString(schoolRecord.schoolName) ?? "",
    } : undefined,
    teacher: teacherRecord ? {
      id: optionalString(teacherRecord.id) ?? "",
      teacherId: optionalString(teacherRecord.teacherId) ?? "",
      fullName: optionalString(teacherRecord.fullName) ?? "",
    } : undefined,
    capacitySummary: capacitySummaryRecord ? {
      capacity: typeof capacitySummaryRecord.capacity === "number" ? capacitySummaryRecord.capacity : null,
      occupied: fallbackNumber(capacitySummaryRecord.occupied, item.studentCount),
      availableSeats: typeof capacitySummaryRecord.availableSeats === "number" ? capacitySummaryRecord.availableSeats : null,
    } : undefined,
  };
}

export function normalizeTeacherClassDetailResponse(payload: unknown): TeacherClassDetailResponse {
  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) return { class: null };
  const record = payload as Record<string, unknown>;
  return { class: normalizeTeacherClassDetail(record.class) };
}

export function normalizeTeacherClassStudentsResponse(payload: unknown): TeacherClassStudentsResponse {
  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
    return {
      students: [],
      pagination: { page: 1, limit: 10, total: 0, totalPages: 0, hasNextPage: false, hasPreviousPage: false },
    };
  }

  const record = payload as Record<string, unknown>;
  const students = Array.isArray(record.students)
    ? record.students.flatMap((student): TeacherClassStudent[] => {
      if (typeof student !== "object" || student === null || Array.isArray(student)) return [];
      const studentRecord = student as Record<string, unknown>;
      const id = optionalString(studentRecord.id);
      const fullName = optionalString(studentRecord.fullName);
      if (!id || !fullName) return [];
      return [{
        id,
        fullName,
        studentId: optionalString(studentRecord.studentId) ?? "",
        accountStatus: (studentRecord.accountStatus as TeacherClassStatus | undefined) ?? "ACTIVE",
      }];
    })
    : [];
  const paginationRecord = typeof record.pagination === "object" && record.pagination !== null && !Array.isArray(record.pagination)
    ? record.pagination as Record<string, unknown>
    : {};

  return {
    students,
    pagination: normalizePagination(paginationRecord, students.length),
  };
}

export function teacherClassDisplayLabel(item: Pick<TeacherClassListItem, "yearLevel" | "className">): string {
  return `${item.yearLevel} ${item.className}`.trim();
}

export function teacherClassYearLabel(yearLevel: number): string {
  return `Tahun ${yearLevel}`;
}

export function teacherClassStatusLabel(status: TeacherClassStatus): string {
  const option = teacherClassStatusOptions.find((item) => item.value === status);
  return option && option.value !== "all" ? option.label : "Tidak diketahui";
}

export function teacherClassSearchPatch(search: string) {
  return { search: search === "" ? undefined : search, page: 1 };
}
