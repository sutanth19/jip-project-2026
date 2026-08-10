import { createElement, type ReactNode } from "react";
import {
  Archive,
  BookOpenCheck,
  BookOpenText,
  Clock3,
  FileText,
  NotebookPen,
  type LucideIcon,
} from "lucide-react";
import seretSukuKataThumbnail from "@/assets/images/img_.seret.png";

export type AdminActivityStatus =
  | "DRAFT"
  | "IN_REVIEW"
  | "PUBLISHED"
  | "ARCHIVED";

export type AdminActivityCategory = "READING" | "WRITING";

export type AdminActivitySortKey = "updatedAt_desc" | "updatedAt_asc" | "title_asc" | "title_desc" | "createdAt_desc";

export type AdminActivityListQuery = {
  page: number;
  limit: number;
  search?: string;
  status?: AdminActivityStatus;
  activityTemplateId?: string;
  templateCategory?: AdminActivityCategory;
  sortBy: "title" | "createdAt" | "updatedAt";
  sortOrder: "asc" | "desc";
};

export type AdminActivityTemplateOption = {
  id: string;
  name: string;
  category: AdminActivityCategory;
  rendererKey: string;
};

export type AdminActivityRecord = {
  id: string;
  title: string;
  status: string;
  updatedAt: string;
  createdAt: string;
  publishedAt: string | null;
  difficulty: string | null;
  template: {
    id: string;
    name: string;
    code?: string | null;
    category: string | null;
    rendererKey: string | null;
  } | null;
  curriculumLinks: Array<{
    id?: string;
    isPrimary: boolean;
    curriculumYear: { id?: string; yearLevel: number; name: string | null } | null;
    remedialSkill: { id?: string; code?: string | null; name: string } | null;
    contentStandard?: { id: string; code: string; title: string } | null;
    learningStandard?: { id: string; code: string } | null;
    learningObjective?: { id: string; code: string | null; description: string } | null;
  }>;
  items: Array<{ id: string }>;
  media: Array<{
    id: string;
    mediaRole: string;
    url: string;
    altText: string | null;
    label: string | null;
  }>;
};

export type AdminActivityListResult = {
  items: AdminActivityRecord[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
};

export type AdminActivitySummary = {
  total: number | null;
  published: number | null;
  draft: number | null;
  archived: number | null;
};

export const defaultAdminActivityQuery: AdminActivityListQuery = {
  page: 1,
  limit: 12,
  templateCategory: "READING",
  sortBy: "updatedAt",
  sortOrder: "desc",
};

export const adminActivityCategoryTabs = [
  { label: "Membaca", value: "READING", icon: BookOpenText },
  { label: "Menulis", value: "WRITING", icon: NotebookPen },
] as const;

export const adminActivitySortOptions: Array<{
  label: string;
  value: AdminActivitySortKey;
  query: Pick<AdminActivityListQuery, "sortBy" | "sortOrder">;
}> = [
  { label: "Terbaharu dikemas kini", value: "updatedAt_desc", query: { sortBy: "updatedAt", sortOrder: "desc" } },
  { label: "Terlama dikemas kini", value: "updatedAt_asc", query: { sortBy: "updatedAt", sortOrder: "asc" } },
  { label: "Nama A-Z", value: "title_asc", query: { sortBy: "title", sortOrder: "asc" } },
  { label: "Nama Z-A", value: "title_desc", query: { sortBy: "title", sortOrder: "desc" } },
  { label: "Terbaharu dicipta", value: "createdAt_desc", query: { sortBy: "createdAt", sortOrder: "desc" } },
] as const;

export const adminActivityStatusOptions: Array<{ label: string; value: "all" | AdminActivityStatus }> = [
  { label: "Semua status", value: "all" },
  { label: "Draf", value: "DRAFT" },
  { label: "Dalam Semakan", value: "IN_REVIEW" },
  { label: "Aktif", value: "PUBLISHED" },
  { label: "Diarkibkan", value: "ARCHIVED" },
] as const;

export const adminActivitySummaryCards: Array<{
  key: keyof AdminActivitySummary;
  title: string;
  description: string;
  icon: LucideIcon;
  iconClassName: string;
}> = [
  { key: "total", title: "Jumlah Aktiviti", description: "Semua aktiviti dalam sistem", icon: FileText, iconClassName: "border-primary/15 bg-primary/10 text-primary" },
  { key: "published", title: "Aktif", description: "Aktiviti tersedia untuk guru", icon: BookOpenCheck, iconClassName: "border-secondary/20 bg-secondary/10 text-secondary" },
  { key: "draft", title: "Draf", description: "Aktiviti belum diterbitkan", icon: NotebookPen, iconClassName: "border-accent/20 bg-accent/10 text-accent" },
  { key: "archived", title: "Diarkibkan", description: "Aktiviti yang diarkibkan", icon: Archive, iconClassName: "border-border bg-muted text-muted-foreground" },
] as const;

export function getAdminActivityResetQuery(query: AdminActivityListQuery): Partial<AdminActivityListQuery> {
  return {
    page: defaultAdminActivityQuery.page,
    limit: defaultAdminActivityQuery.limit,
    search: undefined,
    status: undefined,
    activityTemplateId: undefined,
    templateCategory: query.templateCategory ?? defaultAdminActivityQuery.templateCategory,
    sortBy: defaultAdminActivityQuery.sortBy,
    sortOrder: defaultAdminActivityQuery.sortOrder,
  };
}

export function toAdminActivitySearchParams(query: Partial<AdminActivityListQuery>) {
  const params = new URLSearchParams();

  Object.entries(query).forEach(([key, value]) => {
    if (value === undefined || value === "") {
      return;
    }

    params.set(key, String(value));
  });

  const serialized = params.toString();
  return serialized ? `?${serialized}` : "";
}

export function adminActivityQueryFromSearchParams(searchParams: URLSearchParams): AdminActivityListQuery {
  const page = Number(searchParams.get("page") ?? defaultAdminActivityQuery.page);
  const limit = Number(searchParams.get("limit") ?? defaultAdminActivityQuery.limit);
  const sortBy = searchParams.get("sortBy");
  const sortOrder = searchParams.get("sortOrder");
  const templateCategory = searchParams.get("templateCategory");

  return {
    page: Number.isFinite(page) && page > 0 ? page : defaultAdminActivityQuery.page,
    limit: Number.isFinite(limit) && limit > 0 ? limit : defaultAdminActivityQuery.limit,
    search: searchParams.get("search") ?? undefined,
    status: (searchParams.get("status") as AdminActivityStatus | null) ?? undefined,
    activityTemplateId: searchParams.get("activityTemplateId") ?? undefined,
    templateCategory: templateCategory === "READING" || templateCategory === "WRITING" ? templateCategory : defaultAdminActivityQuery.templateCategory,
    sortBy: sortBy === "title" || sortBy === "createdAt" || sortBy === "updatedAt" ? sortBy : defaultAdminActivityQuery.sortBy,
    sortOrder: sortOrder === "asc" || sortOrder === "desc" ? sortOrder : defaultAdminActivityQuery.sortOrder,
  };
}

export function getAdminActivitySortValue(query: Pick<AdminActivityListQuery, "sortBy" | "sortOrder">): AdminActivitySortKey {
  return (
    adminActivitySortOptions.find((option) => option.query.sortBy === query.sortBy && option.query.sortOrder === query.sortOrder)?.value
    ?? "updatedAt_desc"
  );
}

export function getAdminActivityStatusLabel(status: string): string {
  if (status === "DRAFT") return "Draf";
  if (status === "IN_REVIEW") return "Dalam Semakan";
  if (status === "PUBLISHED") return "Aktif";
  if (status === "ARCHIVED") return "Diarkibkan";
  return status;
}

export function getAdminActivityTemplateLabel(template?: {
  name?: string | null;
  code?: string | null;
  rendererKey?: string | null;
} | null): string {
  if (template?.name?.trim() === "Seret Suku Kata") {
    return "Seret Suku Kata";
  }

  if (template?.code === "ARRANGE_SYLLABLES" || template?.rendererKey === "arrange-syllables" || template?.name?.trim() === "Arrange Syllables") {
    return "Seret Suku Kata";
  }

  return template?.name?.trim() || "Tidak tersedia";
}

export function getAdminActivityCategoryLabel(category: string | null | undefined): string {
  if (category === "READING" || category === "ARRANGEMENT") return "Membaca";
  if (category === "WRITING") return "Menulis";
  return "Tidak tersedia";
}

export function getAdminActivityPrimaryCurriculumLink(activity: AdminActivityRecord) {
  return activity.curriculumLinks.find((link) => link.isPrimary) ?? activity.curriculumLinks[0] ?? null;
}

export function getAdminActivityYearLabel(activity: AdminActivityRecord): string {
  const primaryLink = getAdminActivityPrimaryCurriculumLink(activity);
  const yearLevel = primaryLink?.curriculumYear?.yearLevel;
  return typeof yearLevel === "number" ? `Tahun ${yearLevel}` : "Belum ditetapkan";
}

export function getAdminActivitySkillLabel(activity: AdminActivityRecord): string {
  const primaryLink = getAdminActivityPrimaryCurriculumLink(activity);
  return primaryLink?.remedialSkill?.name ?? "Belum ditetapkan";
}

export function getAdminActivityItemCountLabel(activity: AdminActivityRecord): string {
  const count = activity.items.length;
  return `${count} ${count === 1 ? "item" : "item"}`;
}

export function getAdminActivityDifficultyLabel(value: string | null): string {
  if (!value) return "Tidak tersedia";
  if (value === "BASIC") return "Asas";
  if (value === "INTERMEDIATE") return "Sederhana";
  if (value === "ADVANCED") return "Lanjutan";
  return value;
}

export function getAdminActivityThumbnail(activity: AdminActivityRecord): { src: string; alt: string } | null {
  const cover = activity.media.find((media) => media.mediaRole === "COVER_IMAGE" && media.url);
  if (!cover) return null;

  return {
    src: cover.url,
    alt: cover.altText?.trim() || `Pratonton visual untuk aktiviti ${activity.title}`,
  };
}

export function getAdminActivityTemplateThumbnail(template?: {
  name?: string | null;
  code?: string | null;
  rendererKey?: string | null;
} | null): { src: string; alt: string } | null {
  if (
    template?.name?.trim() === "Seret Suku Kata"
    || template?.name?.trim() === "Arrange Syllables"
    || template?.code === "ARRANGE_SYLLABLES"
    || template?.rendererKey === "arrange-syllables"
  ) {
    return {
      src: seretSukuKataThumbnail,
      alt: "Templat Seret Suku Kata",
    };
  }

  return null;
}

export function getAdminActivityTemplateOptionLabel(option: AdminActivityTemplateOption): string {
  return `${getAdminActivityTemplateLabel(option)} (${getAdminActivityCategoryLabel(option.category)})`;
}

export function getAdminActivityResultRange(meta: AdminActivityListResult["meta"]): string {
  if (meta.total === 0) {
    return "0 aktiviti ditemui";
  }

  const start = (meta.page - 1) * meta.limit + 1;
  const end = Math.min(meta.page * meta.limit, meta.total);
  return `Menunjukkan ${start}-${end} daripada ${meta.total} aktiviti`;
}

export function getAdminActivitySummaryDisplayValue(value: number | null): string {
  return value === null ? "Tidak tersedia" : String(value);
}

export function getAdminActivitySummaryAriaLabel(title: string, value: number | null): string {
  return value === null ? `${title}: tidak tersedia` : `${title}: ${value}`;
}

export function getAdminActivityPlaceholderIcon(category: string | null | undefined): ReactNode {
  return category === "WRITING"
    ? createElement(NotebookPen, { className: "size-8", "aria-hidden": "true" })
    : createElement(BookOpenText, { className: "size-8", "aria-hidden": "true" });
}

export function getAdminActivityUpdatedLabel(value: string): string {
  return value ? new Date(value).toLocaleDateString("ms-MY", { day: "2-digit", month: "long", year: "numeric" }) : "Tidak tersedia";
}

export function getAdminActivityClockText(value: string): string {
  return `Dikemas kini ${getAdminActivityUpdatedLabel(value)}`;
}

export function getAdminActivityMetaRows(activity: AdminActivityRecord): Array<{ label: string; value: string; icon: LucideIcon }> {
  return [
    { label: "Kemahiran", value: getAdminActivitySkillLabel(activity), icon: NotebookPen },
    { label: "Tahun", value: getAdminActivityYearLabel(activity), icon: Clock3 },
  ];
}
