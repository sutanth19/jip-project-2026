import type { AdminAccountStatus, AdminSetupStatus } from "@/features/admin/utils/admin-account-detail";
import { formatAdminDateTime } from "@/features/admin/utils/admin-account-detail";
import type { AdminRecord } from "@/features/admin/types/admin.types";
import { isRecord } from "@/features/admin/utils/record";

export type TeacherStatusTarget = "ACTIVE" | "SUSPENDED" | "ARCHIVED";

export type TeacherSchoolDetail = {
  id: string | null;
  schoolCode: string | null;
  schoolName: string | null;
  logo: string | null;
  principalName: string | null;
  contactEmail: string | null;
  phone: string | null;
};

export type TeacherDetail = {
  id: string;
  teacherId: string | null;
  fullName: string;
  email: string | null;
  phone: string | null;
  avatar: string | null;
  accountStatus: AdminAccountStatus;
  setupStatus: AdminSetupStatus;
  isFirstLogin: boolean;
  setupCompletedAt: string | null;
  lastLogin: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  school: TeacherSchoolDetail | null;
};

export type TeacherLifecycleAction = {
  targetStatus: TeacherStatusTarget;
  label: string;
  dialogTitle: string;
  consequence: string;
  tone: "default" | "warning";
};

const accountStatuses = ["ACTIVE", "PENDING", "SUSPENDED", "ARCHIVED", "LOCKED"] as const;

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function asStatus(value: unknown): AdminAccountStatus {
  return accountStatuses.find((status) => status === value) ?? "LOCKED";
}

function unwrapTeacherPayload(payload: unknown): unknown {
  if (isRecord(payload) && isRecord(payload.teacher)) {
    return payload.teacher;
  }

  return payload;
}

function normalizeTeacherSchool(payload: unknown): TeacherSchoolDetail | null {
  if (!isRecord(payload)) {
    return null;
  }

  return {
    id: asString(payload.id),
    schoolCode: asString(payload.schoolCode),
    schoolName: asString(payload.schoolName),
    logo: asString(payload.logo),
    principalName: asString(payload.principalName),
    contactEmail: asString(payload.contactEmail),
    phone: asString(payload.phone),
  };
}

export function normalizeTeacherDetailRecord(payload: unknown): TeacherDetail | null {
  const record = unwrapTeacherPayload(payload);

  if (!isRecord(record) || !asString(record.id)) {
    return null;
  }

  const accountStatus = asStatus(record.accountStatus);
  const isFirstLogin = record.isFirstLogin === true;

  return {
    id: asString(record.id) ?? "",
    teacherId: asString(record.teacherId),
    fullName: asString(record.fullName) ?? "Tidak tersedia",
    email: asString(record.email),
    phone: asString(record.phone),
    avatar: asString(record.avatar),
    accountStatus,
    setupStatus: accountStatus === "ARCHIVED" ? "ARCHIVED" : isFirstLogin ? "PENDING" : "COMPLETED",
    isFirstLogin,
    setupCompletedAt: asString(record.setupCompletedAt),
    lastLogin: asString(record.lastLogin),
    createdAt: asString(record.createdAt),
    updatedAt: asString(record.updatedAt),
    school: normalizeTeacherSchool(record.school),
  };
}

export function getTeacherInitials(name: string): string {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  return initials || "G";
}

export function formatTeacherDateTime(value: string | null, fallback = "Tidak tersedia"): string {
  return formatAdminDateTime(value, fallback);
}

export function getTeacherLastLoginLabel(value: string | null): string {
  return formatTeacherDateTime(value, "Belum pernah log masuk");
}

export function getTeacherLifecycleAction(
  status: AdminAccountStatus,
  role: string | null,
): TeacherLifecycleAction | null {
  if (status === "ACTIVE") {
    return {
      targetStatus: "SUSPENDED",
      label: "Gantung Akaun",
      dialogTitle: "Gantung akaun guru?",
      consequence: "Guru tidak akan dapat mengakses sistem sehingga akaun diaktifkan semula.",
      tone: "warning",
    };
  }

  if (status === "SUSPENDED") {
    return {
      targetStatus: "ACTIVE",
      label: "Nyahgantung Akaun",
      dialogTitle: "Nyahgantung akaun guru?",
      consequence: "Guru akan dibenarkan mengakses sistem semula.",
      tone: "default",
    };
  }

  if (status === "ARCHIVED" && role === "SUPER_ADMIN") {
    return {
      targetStatus: "ACTIVE",
      label: "Pulihkan Akaun",
      dialogTitle: "Pulihkan akaun guru?",
      consequence: "Akaun guru akan dipulihkan dan diaktifkan semula.",
      tone: "default",
    };
  }

  return null;
}

export function canResendTeacherSetup(detail: TeacherDetail): boolean {
  return detail.accountStatus !== "ARCHIVED" && detail.setupStatus === "PENDING";
}

export function canArchiveTeacher(detail: TeacherDetail): boolean {
  return detail.accountStatus === "ACTIVE" || detail.accountStatus === "SUSPENDED";
}

export function normalizeTeacherDetailForTest(record: AdminRecord): TeacherDetail | null {
  return normalizeTeacherDetailRecord(record);
}
