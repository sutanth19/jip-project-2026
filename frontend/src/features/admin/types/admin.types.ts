import type { AuthRole } from "@/types/auth";

export type AdminEntityKey =
  | "schools"
  | "admins"
  | "teachers"
  | "students"
  | "parents"
  | "classes"
  | "assignments"
  | "submissions"
  | "assessments"
  | "pbdEvidence"
  | "pbdMastery"
  | "notifications"
  | "announcements"
  | "aiOutputs"
  | "auditLogs";

export type AccountStatus = "ACTIVE" | "PENDING" | "SUSPENDED" | "LOCKED" | "ARCHIVED";

export type PageMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type PaginatedResult<T> = {
  items: T[];
  meta: PageMeta;
};

export type AdminRecord = Record<string, unknown> & {
  id?: string;
  accountStatus?: string;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type AdminListQuery = {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  [key: string]: string | number | boolean | undefined;
};

export type AdminField = {
  name: string;
  label: string;
  type?: "text" | "email" | "number" | "date" | "textarea" | "select";
  required?: boolean;
  options?: { label: string; value: string }[];
  placeholder?: string;
};

export type AdminColumn = {
  key: string;
  label: string;
  kind?: "text" | "status" | "date" | "role" | "count";
};

export type AdminEntityConfig = {
  key: AdminEntityKey;
  title: string;
  singular: string;
  description: string;
  path: string;
  endpoint: string;
  roles: AuthRole[];
  columns: AdminColumn[];
  fields?: AdminField[];
  editFieldNames?: string[];
  searchable?: boolean;
  statusFilter?: boolean;
  create?: boolean;
  edit?: boolean;
  lifecycle?: boolean;
  resendSetup?: boolean;
  detailTabs?: string[];
  unsupportedActions?: string[];
};

export type BackendCapability = {
  feature: string;
  supported: boolean;
  note: string;
};
