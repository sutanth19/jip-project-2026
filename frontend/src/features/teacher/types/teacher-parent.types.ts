export type TeacherParentStatus = "ACTIVE" | "PENDING" | "SUSPENDED" | "ARCHIVED" | "LOCKED";

export type TeacherParentRelationship = "FATHER" | "MOTHER" | "GUARDIAN";

export type TeacherParentListQuery = {
  page: number;
  limit: number;
  search?: string;
  status?: TeacherParentStatus;
  relationship?: TeacherParentRelationship;
  sortBy: "fullName" | "phone" | "email" | "occupation" | "accountStatus" | "createdAt" | "updatedAt";
  sortOrder: "asc" | "desc";
};

export type TeacherParentListItem = {
  id: string;
  fullName: string;
  phone: string;
  email: string | null;
  occupation: string | null;
  avatar: string | null;
  accountStatus: TeacherParentStatus;
  studentCount: number;
  relationship: TeacherParentRelationship | null;
};

export type TeacherParentListResponse = {
  parents: TeacherParentListItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
};

export type TeacherParentCreatePayload = {
  fullName: string;
  email: string;
  phone: string;
  relationship: TeacherParentRelationship;
  studentIds: string[];
  occupation?: string;
  address?: string;
  avatar?: string;
};

export type TeacherParentUpdatePayload = {
  fullName?: string;
  email?: string;
  phone?: string;
  relationship?: TeacherParentRelationship;
  studentIds?: string[];
  occupation?: string | null;
  address?: string | null;
  avatar?: string | null;
};

export type TeacherParentStatusUpdatePayload = {
  status: "ACTIVE" | "SUSPENDED" | "ARCHIVED";
};

export type TeacherParentStudent = {
  id: string;
  relationship: TeacherParentRelationship;
  student: {
    id: string;
    studentId: string;
    fullName: string;
    avatar: string | null;
    class: {
      id: string;
      className: string;
      yearLevel: number;
      academicYear: number;
    };
  };
};

export type TeacherParentDetail = {
  id: string;
  userId: string;
  fullName: string;
  phone: string;
  email: string | null;
  occupation: string | null;
  address: string | null;
  avatar: string | null;
  accountStatus: TeacherParentStatus;
  isFirstLogin: boolean;
  lastLogin: string | null;
  createdAt: string;
  updatedAt: string;
  studentCount: number;
  relationship: TeacherParentRelationship | null;
  students: TeacherParentStudent[];
};

export type TeacherParentDetailResponse = {
  parent: TeacherParentDetail | null;
};

export type TeacherParentCreateResult = {
  parent: TeacherParentDetail;
  invitation: {
    status: string;
    expiresAt: string;
  };
};

export type TeacherParentUpdateResult = {
  parent: TeacherParentDetail;
};

export type TeacherParentStatusResult = {
  parent: TeacherParentDetail;
};

export type TeacherParentResendResult = {
  invitation: {
    status: string;
    expiresAt: string;
  };
};
