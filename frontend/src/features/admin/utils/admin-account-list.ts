import type { AdminRecord } from "@/features/admin/types/admin.types";

export type AdminAccountListItem = {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  avatar: string | null;
  accountStatus: string;
  isFirstLogin: boolean;
  lastLogin: string | null;
};

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function mapAdminAccountListItem(record: AdminRecord): AdminAccountListItem {
  return {
    id: asString(record.id) ?? "",
    fullName: asString(record.fullName) ?? "-",
    email: asString(record.email) ?? "-",
    phone: asString(record.phone),
    avatar: asString(record.avatar),
    accountStatus: asString(record.accountStatus) ?? "-",
    isFirstLogin: record.isFirstLogin === true,
    lastLogin: asString(record.lastLogin),
  };
}
