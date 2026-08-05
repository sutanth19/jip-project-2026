export type TeacherClassStatus = "ACTIVE" | "SUSPENDED" | "ARCHIVED";

export type TeacherClassListItem = {
  id: string;
  className: string;
  yearLevel: number;
  academicYear: number;
  studentCount: number;
  accountStatus: TeacherClassStatus;
  teacherId: string;
  schoolId: string;
  createdAt: string;
  updatedAt: string;
};

export type TeacherClassListQuery = {
  page: number;
  limit: number;
  search?: string;
  yearLevel?: number;
  academicYear?: number;
  status?: TeacherClassStatus;
  sortBy: "className" | "yearLevel" | "academicYear" | "accountStatus" | "createdAt" | "updatedAt";
  sortOrder: "asc" | "desc";
};

export type TeacherClassListResponse = {
  classes: TeacherClassListItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
};

export type TeacherClassDetail = TeacherClassListItem & {
  capacity: number | null;
  school?: {
    id: string;
    schoolCode: string;
    schoolName: string;
  };
  teacher?: {
    id: string;
    teacherId: string;
    fullName: string;
  };
  capacitySummary?: {
    capacity: number | null;
    occupied: number;
    availableSeats: number | null;
  };
};

export type TeacherClassDetailResponse = {
  class: TeacherClassDetail | null;
};

export type TeacherClassStudent = {
  id: string;
  studentId: string;
  fullName: string;
  accountStatus: TeacherClassStatus;
};

export type TeacherClassStudentsResponse = {
  students: TeacherClassStudent[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
};
