import type { AdminRecord } from "@/features/admin/types/admin.types";
import { isRecord } from "@/features/admin/utils/record";
import { formatDateTime } from "@/utils/date";

export type AdminAccountStatus =
  | "ACTIVE"
  | "PENDING"
  | "SUSPENDED"
  | "ARCHIVED"
  | "LOCKED";

export type AdminSetupStatus =
  | "PENDING"
  | "EXPIRED"
  | "COMPLETED"
  | "ARCHIVED";

export type AdminStatusTarget = "ACTIVE" | "SUSPENDED" | "ARCHIVED";

export type AdminAccountDetail = {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  position: string | null;
  avatar: string | null;
  accountStatus: AdminAccountStatus;
  setupStatus: AdminSetupStatus | null;
  isFirstLogin: boolean;
  lastLogin: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

export type AdminLifecycleAction = {
  targetStatus: AdminStatusTarget;
  label: string;
  dialogTitle: string;
  consequence: string;
  tone: "default" | "warning" | "destructive";
};

const accountStatuses = ["ACTIVE", "PENDING", "SUSPENDED", "ARCHIVED", "LOCKED"] as const;
const setupStatuses = ["PENDING", "EXPIRED", "COMPLETED", "ARCHIVED"] as const;

export const adminAccountStatusLabels: Record<AdminAccountStatus, string> = {
  ACTIVE: "Aktif",
  PENDING: "Menunggu",
  SUSPENDED: "Digantung",
  ARCHIVED: "Diarkibkan",
  LOCKED: "Dikunci",
};

export const adminSetupStatusLabels: Record<AdminSetupStatus, string> = {
  COMPLETED: "Selesai",
  PENDING: "Menunggu Setup",
  EXPIRED: "Pautan Tamat Tempoh",
  ARCHIVED: "Diarkibkan",
};

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function asStatus(value: unknown): AdminAccountStatus {
  return accountStatuses.find((status) => status === value) ?? "LOCKED";
}

function asSetupStatus(value: unknown): AdminSetupStatus | null {
  return setupStatuses.find((status) => status === value) ?? null;
}

function unwrapAdminPayload(payload: unknown): unknown {
  if (isRecord(payload) && isRecord(payload.admin)) {
    return payload.admin;
  }

  return payload;
}

export function normalizeAdminDetailRecord(payload: unknown): AdminAccountDetail | null {
  const record = unwrapAdminPayload(payload);

  if (!isRecord(record) || !asString(record.id)) {
    return null;
  }

  return {
    id: asString(record.id) ?? "",
    fullName: asString(record.fullName) ?? "Tidak tersedia",
    email: asString(record.email) ?? "Tidak tersedia",
    phone: asString(record.phone),
    position: asString(record.position),
    avatar: asString(record.avatar),
    accountStatus: asStatus(record.accountStatus),
    setupStatus: asSetupStatus(record.setupStatus),
    isFirstLogin: record.isFirstLogin === true,
    lastLogin: asString(record.lastLogin),
    createdAt: asString(record.createdAt),
    updatedAt: asString(record.updatedAt),
  };
}

export function getAdminInitials(name: string): string {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  return initials || "A";
}

export function formatAdminDateTime(value: string | null, fallback = "Tidak tersedia"): string {
  if (!value) {
    return fallback;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return fallback;
  }

  return formatDateTime(date);
}

export function getAdminLastLoginLabel(value: string | null): string {
  return formatAdminDateTime(value, "Belum pernah log masuk");
}

export function getAdminLifecycleAction(status: AdminAccountStatus): AdminLifecycleAction | null {
  if (status === "ACTIVE") {
    return {
      targetStatus: "SUSPENDED",
      label: "Gantung Akaun",
      dialogTitle: "Gantung akaun pentadbir?",
      consequence: "Pentadbir tidak akan dapat mengakses sistem sehingga akaun diaktifkan semula.",
      tone: "warning",
    };
  }

  if (status === "SUSPENDED" || status === "PENDING" || status === "ARCHIVED") {
    return {
      targetStatus: "ACTIVE",
      label: status === "ARCHIVED" ? "Pulihkan Akaun" : "Aktifkan Akaun",
      dialogTitle: status === "ARCHIVED" ? "Pulihkan akaun pentadbir?" : "Aktifkan akaun pentadbir?",
      consequence: "Pentadbir akan dibenarkan mengakses sistem mengikut kebenaran akaun Admin.",
      tone: "default",
    };
  }

  return null;
}

export function canResendAdminSetup(detail: AdminAccountDetail): boolean {
  return (
    detail.accountStatus !== "ARCHIVED" &&
    (detail.setupStatus === "PENDING" || detail.setupStatus === "EXPIRED")
  );
}

export function canArchiveAdmin(detail: AdminAccountDetail): boolean {
  return detail.accountStatus !== "ARCHIVED";
}

export function containsUnsafeAdminDetailValue(markup: string): boolean {
  return /\b(null|undefined|Invalid Date|NaN)\b/.test(markup);
}

export function normalizeAdminDetailForTest(record: AdminRecord): AdminAccountDetail | null {
  return normalizeAdminDetailRecord(record);
}
