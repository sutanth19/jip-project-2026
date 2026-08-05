export type TeacherStudentStatus = "ACTIVE" | "PENDING" | "SUSPENDED" | "ARCHIVED" | "LOCKED";

export type TeacherStudentListItem = {
  id: string;
  userId: string;
  schoolId: string;
  classId: string;
  studentId: string;
  fullName: string;
  avatar: string | null;
  accountStatus: TeacherStudentStatus;
  remedialLevel: null;
  createdAt: string;
  updatedAt: string;
  class: {
    id: string;
    className: string;
    yearLevel: number;
    academicYear: number;
  } | null;
};

export type TeacherStudentListQuery = {
  page: number;
  limit: number;
  search?: string;
  yearLevel?: number;
  classId?: string;
  status?: TeacherStudentStatus;
  sortBy: "studentId" | "fullName" | "accountStatus" | "createdAt" | "updatedAt" | "birthDate";
  sortOrder: "asc" | "desc";
};

export type TeacherStudentListResponse = {
  students: TeacherStudentListItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
};

export type TeacherStudentCreatePayload = {
  classId: string;
  fullName: string;
  yearLevel: number;
  gender: "MALE" | "FEMALE";
};

export type TeacherStudentCreateResult = {
  student: {
    id: string;
    studentId: string;
    fullName: string;
    accountStatus: TeacherStudentStatus;
    class: {
      id: string;
      className: string;
      yearLevel: number;
      academicYear: number;
    } | null;
  };
  credentials: {
    studentId: string;
    temporaryPin: string;
  };
};

export type TeacherStudentDetailParent = {
  id: string;
  fullName: string;
  relationship: string;
  phone?: string;
  occupation?: string | null;
  avatar: string | null;
};

export type TeacherStudentDetail = {
  id: string;
  userId: string;
  schoolId: string;
  classId: string;
  studentId: string;
  fullName: string;
  gender: "MALE" | "FEMALE";
  birthDate: string | null;
  avatar: string | null;
  accountStatus: TeacherStudentStatus;
  isPinChanged: boolean;
  createdAt: string;
  updatedAt: string;
  linkedParentCount: number;
  school: {
    id: string;
    schoolCode: string;
    schoolName: string;
  };
  class: {
    id: string;
    className: string;
    yearLevel: number;
    academicYear: number;
    accountStatus?: "ACTIVE" | "SUSPENDED" | "ARCHIVED";
  };
  parents: TeacherStudentDetailParent[];
};

export type TeacherStudentDetailResponse = {
  student: TeacherStudentDetail | null;
};

export type TeacherStudentUpdatePayload = {
  fullName: string;
  yearLevel: number;
  classId: string;
  gender: "MALE" | "FEMALE";
};

export type TeacherStudentStatusUpdatePayload = {
  status: "ACTIVE" | "SUSPENDED" | "ARCHIVED";
};

export type TeacherStudentPinResetResult = {
  credentials: {
    studentId: string;
    temporaryPin: string;
  };
};
