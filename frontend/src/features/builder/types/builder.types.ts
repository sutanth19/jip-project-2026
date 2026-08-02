import type { AuthRole } from "@/types/auth";

export type BuilderEntityKey =
  | "curriculumVersions"
  | "programmes"
  | "years"
  | "remedialSkills"
  | "contentStandards"
  | "learningStandards"
  | "objectives"
  | "questionBank"
  | "activityTemplates"
  | "digitalActivities";

export type BuilderRecord = Record<string, unknown> & {
  id?: string;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type BuilderQuery = {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  [key: string]: string | number | boolean | undefined;
};

export type BuilderColumn = {
  key: string;
  label: string;
  kind?: "text" | "status" | "date" | "badge";
};

export type BuilderField = {
  name: string;
  label: string;
  type?: "text" | "email" | "number" | "date" | "textarea" | "select" | "checkbox";
  required?: boolean;
  options?: { label: string; value: string }[];
};

export type BuilderEntityConfig = {
  key: BuilderEntityKey;
  title: string;
  singular: string;
  description: string;
  path: string;
  endpoint: string;
  detailEndpoint?: string;
  roles: AuthRole[];
  manageRoles: AuthRole[];
  columns: BuilderColumn[];
  fields?: BuilderField[];
  editFieldNames?: string[];
  searchable?: boolean;
  statusFilter?: boolean;
  supportsCreate?: boolean;
  supportsEdit?: boolean;
  unsupportedActions?: string[];
};

export type BuilderPageMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type BuilderListResult = {
  items: BuilderRecord[];
  meta: BuilderPageMeta;
};

export type WizardStep = {
  id: string;
  title: string;
  description: string;
};

