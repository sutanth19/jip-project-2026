import { Clock3, FileText, Plus, Search, SlidersHorizontal, type LucideIcon } from "lucide-react";
import { Link } from "react-router-dom";

import { EmptyState, ErrorState, Pagination } from "@/components/shared";
import { AdminPageHeader } from "@/features/admin/components/AdminPageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  adminActivityCategoryTabs,
  adminActivitySortOptions,
  adminActivityStatusOptions,
  adminActivitySummaryCards,
  getAdminActivityCategoryLabel,
  getAdminActivityClockText,
  getAdminActivityDifficultyLabel,
  getAdminActivityItemCountLabel,
  getAdminActivityMetaRows,
  getAdminActivityPlaceholderIcon,
  getAdminActivityResultRange,
  getAdminActivityResetQuery,
  getAdminActivitySortValue,
  getAdminActivityStatusLabel,
  getAdminActivitySummaryAriaLabel,
  getAdminActivitySummaryDisplayValue,
  getAdminActivityTemplateOptionLabel,
  getAdminActivityThumbnail,
  type AdminActivityCategory,
  type AdminActivityListQuery,
  type AdminActivityListResult,
  type AdminActivityRecord,
  type AdminActivitySortKey,
  type AdminActivitySummary,
  type AdminActivityTemplateOption,
} from "@/features/admin/utils/admin-activity";
import { useDebouncedSearchInput } from "@/features/admin/hooks/use-debounced-search-input";
import { cn } from "@/lib/utils";

function AdminActivityStatusBadge({ status }: { status: string }) {
  const label = getAdminActivityStatusLabel(status);
  const classes =
    status === "PUBLISHED"
      ? "border-emerald-300 bg-emerald-100 text-emerald-800 dark:border-emerald-400/25 dark:bg-emerald-400/10 dark:text-emerald-300"
      : status === "DRAFT"
        ? "border-slate-300 bg-slate-200 text-slate-700 dark:border-slate-400/25 dark:bg-slate-400/10 dark:text-slate-300"
        : status === "IN_REVIEW"
          ? "border-amber-300 bg-amber-100 text-amber-800 dark:border-amber-400/25 dark:bg-amber-400/10 dark:text-amber-300"
          : "border-orange-300 bg-orange-100 text-orange-800 dark:border-orange-400/25 dark:bg-orange-400/10 dark:text-orange-300";

  return (
    <span
      className={cn(
        "inline-flex h-8 min-w-[112px] items-center justify-center rounded-full border px-3 text-sm font-semibold shadow-sm",
        classes,
      )}
    >
      {label}
    </span>
  );
}

function AdminActivitySummaryCard({
  title,
  description,
  value,
  icon: Icon,
  iconClassName,
}: {
  title: string;
  description: string;
  value: number | null;
  icon: LucideIcon;
  iconClassName: string;
}) {
  return (
    <article className="flex h-full flex-col rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6" aria-label={getAdminActivitySummaryAriaLabel(title, value)}>
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-3xl font-semibold tracking-tight text-foreground">{getAdminActivitySummaryDisplayValue(value)}</p>
        </div>
        <div className={cn("flex size-12 shrink-0 items-center justify-center rounded-2xl border", iconClassName)}>
          <Icon className="size-5" aria-hidden="true" />
        </div>
      </div>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">{description}</p>
    </article>
  );
}

export function AdminActivitySummarySection({
  summary,
  isLoading,
}: {
  summary: AdminActivitySummary | undefined;
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-busy="true" aria-label="Memuatkan ringkasan aktiviti">
        {adminActivitySummaryCards.map((card) => (
          <div key={card.key} className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="mt-3 h-9 w-24" />
            <Skeleton className="mt-4 h-4 w-full" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {adminActivitySummaryCards.map((card) => (
        <AdminActivitySummaryCard
          key={card.key}
          title={card.title}
          description={card.description}
          value={summary?.[card.key] ?? null}
          icon={card.icon}
          iconClassName={card.iconClassName}
        />
      ))}
    </div>
  );
}

export function AdminActivityFilters({
  query,
  templates,
  onChange,
}: {
  query: AdminActivityListQuery;
  templates: AdminActivityTemplateOption[];
  onChange: (patch: Partial<AdminActivityListQuery>) => void;
}) {
  const { searchInput, handleSearchInputChange, resetSearchInput } = useDebouncedSearchInput({
    value: query.search,
    onChange: (patch) => onChange({ ...patch, page: 1 } as Partial<AdminActivityListQuery>),
  });

  return (
    <div className="mt-6 space-y-5">
      <Tabs
        value={query.templateCategory ?? "READING"}
        onValueChange={(value) => onChange({ templateCategory: value as AdminActivityCategory, page: 1 })}
      >
        <TabsList className="h-auto w-full justify-start gap-6 overflow-x-auto rounded-none border-b border-border bg-transparent p-0">
          {adminActivityCategoryTabs.map((tab) => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className="gap-2 rounded-none border-b-2 border-transparent bg-transparent px-1 pb-3 pt-1 text-muted-foreground shadow-none transition-colors hover:text-foreground data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none"
            >
              <tab.icon className="size-4" aria-hidden="true" />
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <label className="relative flex-1">
          <span className="sr-only">Cari nama aktiviti</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input
            value={searchInput}
            onChange={handleSearchInputChange}
            placeholder="Cari nama aktiviti..."
            className="!bg-background/40 pl-9 text-foreground placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-primary/20"
          />
        </label>

        <label className="w-full text-sm sm:w-auto">
          <span className="sr-only">Status</span>
          <Select
            value={query.status ?? "all"}
            onValueChange={(value) => onChange({ status: value === "all" ? undefined : value as AdminActivityListQuery["status"], page: 1 })}
          >
            <SelectTrigger className="!bg-background/40 sm:w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {adminActivityStatusOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>

        <label className="w-full text-sm sm:w-auto">
          <span className="sr-only">Templat</span>
          <Select
            value={query.activityTemplateId ?? "all"}
            onValueChange={(value) => onChange({ activityTemplateId: value === "all" ? undefined : value, page: 1 })}
          >
            <SelectTrigger className="!bg-background/40 sm:w-64">
              <SelectValue placeholder="Semua templat" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua templat</SelectItem>
              {templates.map((template) => (
                <SelectItem key={template.id} value={template.id}>
                  {getAdminActivityTemplateOptionLabel(template)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>

        <Button
          type="button"
          variant="outline"
          className="w-full sm:w-auto"
          onClick={() => {
            resetSearchInput();
            onChange(getAdminActivityResetQuery(query));
          }}
        >
          <SlidersHorizontal className="size-4" aria-hidden="true" />
          Reset
        </Button>
      </div>
    </div>
  );
}

export function AdminActivityResultsHeader({
  meta,
  query,
  onChange,
}: {
  meta: AdminActivityListResult["meta"];
  query: AdminActivityListQuery;
  onChange: (patch: Partial<AdminActivityListQuery>) => void;
}) {
  return (
    <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm font-medium text-foreground">{getAdminActivityResultRange(meta)}</p>

      <label className="w-full text-sm sm:w-auto">
        <span className="sr-only">Susun ikut</span>
        <Select
          value={getAdminActivitySortValue(query)}
          onValueChange={(value) => {
            const selected = adminActivitySortOptions.find((option) => option.value === value as AdminActivitySortKey);
            if (selected) {
              onChange({ ...selected.query, page: 1 });
            }
          }}
        >
          <SelectTrigger className="!bg-background/40 sm:w-64">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {adminActivitySortOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </label>
    </div>
  );
}

export function AdminActivityCard({ activity }: { activity: AdminActivityRecord }) {
  const thumbnail = getAdminActivityThumbnail(activity);
  const category = getAdminActivityCategoryLabel(activity.template?.category);
  const metaRows = getAdminActivityMetaRows(activity);

  return (
    <article className="flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-colors hover:border-primary/25 hover:bg-muted/15">
      <div className="aspect-[16/9] border-b border-border bg-muted/50">
        {thumbnail ? (
          <img
            src={thumbnail.src}
            alt={thumbnail.alt}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-muted via-card to-muted/60 text-muted-foreground">
            {getAdminActivityPlaceholderIcon(activity.template?.category)}
          </div>
        )}
      </div>

      <div className="flex h-full flex-col p-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex h-8 items-center rounded-full border border-primary/15 bg-primary/5 px-3 text-sm font-medium text-primary">
            {category}
          </span>
          <AdminActivityStatusBadge status={activity.status} />
        </div>

        <div className="mt-4">
          <h2 className="line-clamp-2 text-lg font-semibold text-foreground">{activity.title}</h2>
          <p className="mt-2 text-sm text-muted-foreground">{activity.template?.name ?? "Templat tidak tersedia"}</p>
        </div>

        <dl className="mt-4 grid gap-3 text-sm">
          {metaRows.map((item) => (
            <div key={item.label} className="flex items-start gap-3">
              <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <item.icon className="size-4" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <dt className="text-muted-foreground">{item.label}</dt>
                <dd className="mt-1 break-words font-medium text-foreground">{item.value}</dd>
              </div>
            </div>
          ))}
        </dl>

        <div className="mt-4 flex flex-wrap gap-2 text-sm text-muted-foreground">
          <span className="rounded-full bg-muted px-3 py-1">{getAdminActivityItemCountLabel(activity)}</span>
          <span className="rounded-full bg-muted px-3 py-1">{getAdminActivityDifficultyLabel(activity.difficulty)}</span>
        </div>

        <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
          <Clock3 className="size-4" aria-hidden="true" />
          <span>{getAdminActivityClockText(activity.updatedAt)}</span>
        </div>

        <div className="mt-auto flex flex-col gap-3 pt-5 sm:flex-row">
          <Button asChild variant="outline" className="h-11 flex-1 rounded-xl px-4">
            <Link to={`/digital-activities/${activity.id}/preview`}>Pratonton</Link>
          </Button>
          <Button asChild className="h-11 flex-1 rounded-xl bg-primary px-4 font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 focus-visible:ring-primary/30">
            <Link to={`/digital-activities/${activity.id}/edit`}>Edit</Link>
          </Button>
        </div>
      </div>
    </article>
  );
}

export function AdminActivityList({
  activities,
  isLoading,
}: {
  activities: AdminActivityRecord[];
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3" aria-busy="true" aria-label="Memuatkan aktiviti">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
            <Skeleton className="aspect-[16/9] w-full rounded-none" />
            <div className="space-y-4 p-5">
              <div className="flex gap-2">
                <Skeleton className="h-8 w-24 rounded-full" />
                <Skeleton className="h-8 w-28 rounded-full" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-5 w-4/5" />
                <Skeleton className="h-4 w-3/5" />
              </div>
              <Skeleton className="h-20 w-full" />
              <div className="flex gap-3">
                <Skeleton className="h-11 flex-1 rounded-xl" />
                <Skeleton className="h-11 flex-1 rounded-xl" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {activities.map((activity) => (
        <AdminActivityCard key={activity.id} activity={activity} />
      ))}
    </div>
  );
}

export function AdminActivityManagementView({
  query,
  summary,
  summaryLoading,
  summaryError,
  activities,
  templates,
  isLoading,
  isError,
  onRetrySummary,
  onRetryActivities,
  onChange,
}: {
  query: AdminActivityListQuery;
  summary: AdminActivitySummary | undefined;
  summaryLoading: boolean;
  summaryError: boolean;
  activities: AdminActivityListResult | undefined;
  templates: AdminActivityTemplateOption[];
  isLoading: boolean;
  isError: boolean;
  onRetrySummary: () => void;
  onRetryActivities: () => void;
  onChange: (patch: Partial<AdminActivityListQuery>) => void;
}) {
  const total = activities?.meta.total ?? 0;
  const hasActiveFilters = Boolean(query.search || query.status || query.activityTemplateId);

  return (
    <>
      <AdminPageHeader
        title="Pengurusan Aktiviti"
        description="Cipta, urus dan terbitkan aktiviti pembelajaran Membaca dan Menulis untuk digunakan oleh guru."
        actions={(
          <Button asChild variant="secondary">
            <Link
              to="/admin/aktiviti/cipta"
              className="h-12 rounded-xl px-6 font-semibold shadow-sm hover:bg-secondary/90 focus-visible:ring-secondary/30"
            >
              <Plus className="size-4" aria-hidden="true" />
              Cipta Aktiviti
            </Link>
          </Button>
        )}
      />

      <div className="mt-6 space-y-6">
        {summaryError ? (
          <ErrorState
            title="Ringkasan aktiviti tidak dapat dimuatkan"
            description="Sila cuba semula. Jika masalah berterusan, hubungi pentadbir sistem."
            actionLabel="Cuba Semula"
            onAction={onRetrySummary}
          />
        ) : (
          <AdminActivitySummarySection summary={summary} isLoading={summaryLoading} />
        )}

        <AdminActivityFilters query={query} templates={templates} onChange={onChange} />

        {activities ? <AdminActivityResultsHeader meta={activities.meta} query={query} onChange={onChange} /> : null}

        {isError ? (
          <ErrorState
            title="Aktiviti tidak dapat dimuatkan"
            description="Sila cuba semula. Jika masalah berterusan, hubungi pentadbir sistem."
            actionLabel="Cuba Semula"
            onAction={onRetryActivities}
          />
        ) : null}

        {!isError && !isLoading && activities && total === 0 ? (
          hasActiveFilters ? (
            <EmptyState
              icon={<Search className="size-5" aria-hidden="true" />}
              title="Tiada aktiviti ditemui"
              description="Cuba ubah carian atau penapis anda."
              action={(
                <Button type="button" variant="outline" onClick={() => onChange(getAdminActivityResetQuery(query))}>
                  Reset
                </Button>
              )}
            />
          ) : (
            <EmptyState
              icon={<FileText className="size-5" aria-hidden="true" />}
              title="Tiada aktiviti lagi"
              description="Cipta aktiviti pembelajaran pertama untuk digunakan oleh guru."
              action={(
                <Button asChild variant="secondary">
                  <Link to="/admin/aktiviti/cipta">Cipta Aktiviti</Link>
                </Button>
              )}
            />
          )
        ) : null}

        {!isError && (isLoading || (activities && total > 0)) ? (
          <AdminActivityList activities={activities?.items ?? []} isLoading={isLoading} />
        ) : null}

        {activities && total > 0 ? (
          <Pagination page={activities.meta.page} totalPages={activities.meta.totalPages} onPageChange={(page) => onChange({ page })} />
        ) : null}
      </div>
    </>
  );
}
