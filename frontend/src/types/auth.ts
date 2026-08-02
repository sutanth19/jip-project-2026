export type AuthRole = "SUPER_ADMIN" | "ADMIN" | "TEACHER" | "STUDENT" | "PARENT";

export type PermissionKey =
  | "dashboard:view"
  | "schools:manage"
  | "users:manage"
  | "curriculum:manage"
  | "activities:manage"
  | "assignments:manage"
  | "submissions:review"
  | "reports:view"
  | "notifications:view"
  | "announcements:manage"
  | "ai:view"
  | "settings:manage";

export type AuthUser = {
  id: string;
  role: AuthRole;
  email: string | null;
  accountStatus: string;
  isFirstLogin?: boolean;
};

export type StaffProfile = {
  id: string;
  fullName: string;
  schoolId: string | null;
};

export type StudentProfile = {
  id: string;
  studentId: string;
  fullName: string;
  schoolId: string;
  classId: string;
  className: string;
  yearLevel: number;
};

export type AuthProfile = StaffProfile | StudentProfile;

export type SchoolContext = {
  id: string;
  name?: string;
} | null;

export type AuthSession = {
  accessToken: string;
  refreshToken: string | null;
  user: AuthUser;
  profile: AuthProfile;
  role: AuthRole;
  permissions: PermissionKey[];
  school: SchoolContext;
  requiresPasswordChange: boolean;
  requiresPinChange: boolean;
};

export type LoginAudience = "admin" | "teacher" | "student" | "parent";

