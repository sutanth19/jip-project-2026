export const adminStatusFilterOptions = [
  { label: "Semua status", value: "all" },
  { label: "Aktif", value: "ACTIVE" },
  { label: "Menunggu", value: "PENDING" },
  { label: "Digantung", value: "SUSPENDED" },
  { label: "Diarkibkan", value: "ARCHIVED" },
  { label: "Dikunci", value: "LOCKED" },
] as const;

export const adminPageSizeOptions = [10, 20, 50] as const;

export function getAdminPageSizeQuery(limit: number) {
  return { limit, page: 1 };
}

export const adminBadgeBaseClass =
  "inline-flex h-8 min-w-[112px] items-center justify-center rounded-full border px-3 text-sm font-semibold shadow-sm";

export const adminAccountBadgeToneClasses: Record<string, string> = {
  ACTIVE: "border-emerald-300 bg-emerald-100 text-emerald-800 dark:border-emerald-400/25 dark:bg-emerald-400/10 dark:text-emerald-300",
  PENDING: "border-amber-300 bg-amber-100 text-amber-800 dark:border-amber-400/25 dark:bg-amber-400/10 dark:text-amber-300",
  SUSPENDED: "border-orange-300 bg-orange-100 text-orange-800 dark:border-orange-400/25 dark:bg-orange-400/10 dark:text-orange-300",
  ARCHIVED: "border-slate-300 bg-slate-200 text-slate-700 dark:border-slate-400/25 dark:bg-slate-400/10 dark:text-slate-300",
  LOCKED: "border-red-300 bg-red-100 text-red-800 dark:border-red-400/25 dark:bg-red-400/10 dark:text-red-300",
  UNKNOWN: "border-border bg-muted/40 text-muted-foreground",
};

export const adminSetupBadgeToneClasses: Record<string, string> = {
  PENDING: adminAccountBadgeToneClasses.PENDING,
  EXPIRED: adminAccountBadgeToneClasses.LOCKED,
  COMPLETED: adminAccountBadgeToneClasses.ACTIVE,
  ARCHIVED: adminAccountBadgeToneClasses.ARCHIVED,
  WAITING: adminAccountBadgeToneClasses.PENDING,
  DONE: adminAccountBadgeToneClasses.ACTIVE,
  UNKNOWN: adminAccountBadgeToneClasses.UNKNOWN,
};
