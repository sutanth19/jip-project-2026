import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Archive, Clock3, FileText, Plus, RotateCcw, Search, SlidersHorizontal, Trash2, type LucideIcon } from "lucide-react";
import { Link } from "react-router-dom";

import { ConfirmDialog, EmptyState, ErrorState, Pagination } from "@/components/shared";
import { AdminPageHeader } from "@/features/admin/components/AdminPageHeader";
import { archiveAdminDigitalActivity, deleteAdminDigitalActivity, publishAdminDigitalActivity } from "@/features/admin/api/admin-activity.api";
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
  getAdminActivityClockText,
  getAdminActivityMetaRows,
  getAdminActivityPlaceholderIcon,
  getAdminActivityResultRange,
  getAdminActivityResetQuery,
  getAdminActivitySortValue,
  getAdminActivityStatusLabel,
  getAdminActivitySummaryAriaLabel,
  getAdminActivitySummaryDisplayValue,
  getAdminActivityTemplateThumbnail,
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
import { parseApiError } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useToast } from "@/providers/toast-context-value";

function AdminActivityStatusBadge({ status }: { status: string }) {
  const label = getAdminActivityStatusLabel(status);
  const classes =
    status === "PUBLISHED"
      ? "border-emerald-300 bg-emerald-100 text-emerald-800 dark:border-emerald-400/25 dark:bg-emerald-400/10 dark:text-emerald-300"
      : status === "DRAFT"
        ? "border-sky-300 bg-sky-100 text-sky-800 dark:border-sky-400/25 dark:bg-sky-400/10 dark:text-sky-300"
        : status === "IN_REVIEW"
          ? "border-amber-300 bg-amber-100 text-amber-800 dark:border-amber-400/25 dark:bg-amber-400/10 dark:text-amber-300"
          : "border-slate-300 bg-slate-200 text-slate-700 dark:border-slate-400/25 dark:bg-slate-400/10 dark:text-slate-300";

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
  const availableTemplates = templates.filter((template) => template.category === (query.templateCategory ?? "READING"));
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
              {availableTemplates.map((template) => (
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

function getDeleteErrorMessage(error: unknown): string {
  const parsed = parseApiError(error);

  if (parsed.code === "DIGITAL_ACTIVITY_DELETE_BLOCKED") {
    return "Aktiviti ini tidak boleh dipadam kerana sedang digunakan.";
  }

  if (parsed.code === "DIGITAL_ACTIVITY_NOT_EDITABLE" || parsed.code === "DIGITAL_ACTIVITY_STATUS_TRANSITION_INVALID") {
    return "Aktiviti ini tidak boleh dipadam pada status semasa.";
  }

  return "Aktiviti tidak dapat dipadam.";
}

function getArchiveErrorMessage(error: unknown): string {
  const parsed = parseApiError(error);

  if (parsed.code === "DIGITAL_ACTIVITY_STATUS_TRANSITION_INVALID") {
    return "Aktiviti ini tidak boleh diarkibkan pada status semasa.";
  }

  return "Aktiviti tidak dapat diarkibkan.";
}

function getPublishErrorMessage(error: unknown): string {
  const parsed = parseApiError(error);

  if (parsed.code === "DIGITAL_ACTIVITY_PUBLICATION_INVALID") {
    return parsed.message || "Aktiviti ini belum memenuhi syarat untuk diaktifkan semula.";
  }

  if (parsed.code === "DIGITAL_ACTIVITY_STATUS_TRANSITION_INVALID") {
    return "Aktiviti ini tidak boleh diaktifkan semula pada status semasa.";
  }

  return "Aktiviti tidak dapat diaktifkan semula.";
}

export function AdminActivityCard({
  activity,
  currentPage,
  pageSize,
  totalItems,
  onPageChange,
}: {
  activity: AdminActivityRecord;
  currentPage: number;
  pageSize: number;
  totalItems: number;
  onPageChange: (page: number) => void;
}) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [archiveOpen, setArchiveOpen] = React.useState(false);
  const [reactivateOpen, setReactivateOpen] = React.useState(false);
  const thumbnail = getAdminActivityThumbnail(activity) ?? getAdminActivityTemplateThumbnail(activity.template);
  const metaRows = getAdminActivityMetaRows(activity);
  const isDraft = activity.status === "DRAFT";
  const isPublished = activity.status === "PUBLISHED";
  const isArchived = activity.status === "ARCHIVED";
  const deleteMutation = useMutation({
    mutationFn: () => deleteAdminDigitalActivity(activity.id),
    onSuccess: async () => {
      setDeleteOpen(false);
      const nextTotal = Math.max(totalItems - 1, 0);
      const nextTotalPages = Math.max(1, Math.ceil(nextTotal / Math.max(pageSize, 1)));
      if (currentPage > nextTotalPages) {
        onPageChange(nextTotalPages);
      }
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin", "activities", "list"] }),
        queryClient.invalidateQueries({ queryKey: ["admin", "activities", "summary"] }),
        queryClient.invalidateQueries({ queryKey: ["admin", "activities", "detail", activity.id] }),
      ]);
      toast.success("Aktiviti berjaya dipadam.");
    },
    onError: (error) => {
      toast.error("Aktiviti tidak dapat dipadam", getDeleteErrorMessage(error));
    },
  });
  const archiveMutation = useMutation({
    mutationFn: () => archiveAdminDigitalActivity(activity.id),
    onSuccess: async () => {
      setArchiveOpen(false);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin", "activities", "list"] }),
        queryClient.invalidateQueries({ queryKey: ["admin", "activities", "summary"] }),
        queryClient.invalidateQueries({ queryKey: ["admin", "activities", "detail", activity.id] }),
        queryClient.invalidateQueries({ queryKey: ["admin", "activities", "preview", activity.id] }),
      ]);
      toast.success("Aktiviti berjaya diarkibkan.");
    },
    onError: (error) => {
      toast.error("Aktiviti tidak dapat diarkibkan", getArchiveErrorMessage(error));
    },
  });
  const reactivateMutation = useMutation({
    mutationFn: () => publishAdminDigitalActivity(activity.id),
    onSuccess: async () => {
      setReactivateOpen(false);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin", "activities", "list"] }),
        queryClient.invalidateQueries({ queryKey: ["admin", "activities", "summary"] }),
        queryClient.invalidateQueries({ queryKey: ["admin", "activities", "detail", activity.id] }),
        queryClient.invalidateQueries({ queryKey: ["admin", "activities", "preview", activity.id] }),
        queryClient.invalidateQueries({ queryKey: ["admin", "activities", "publish-readiness", activity.id] }),
      ]);
      toast.success("Aktiviti berjaya diaktifkan semula.");
    },
    onError: (error) => {
      toast.error("Aktiviti tidak dapat diaktifkan semula", getPublishErrorMessage(error));
    },
  });

  return (
    <>
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
          <div className="flex items-start justify-between gap-3">
            <h2 className="line-clamp-2 min-w-0 text-lg font-semibold text-foreground">{activity.title}</h2>
            <div className="shrink-0">
              <AdminActivityStatusBadge status={activity.status} />
            </div>
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

          <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
            <Clock3 className="size-4" aria-hidden="true" />
            <span>{getAdminActivityClockText(activity.updatedAt)}</span>
          </div>

          <div className="mt-auto space-y-3 pt-5">
            <div className="grid gap-3 sm:grid-cols-2">
              {isDraft ? (
                <Button
                  type="button"
                  variant="destructive"
                  className="h-11 rounded-xl px-4 font-semibold"
                  onClick={() => setDeleteOpen(true)}
                  aria-label={`Padam aktiviti ${activity.title}`}
                >
                  <Trash2 className="size-4" aria-hidden="true" />
                  Padam
                </Button>
              ) : isPublished ? (
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 rounded-xl border-amber-500 bg-amber-500 px-4 font-semibold text-white shadow-sm hover:border-amber-600 hover:bg-amber-600 hover:text-white focus-visible:border-amber-700 focus-visible:ring-amber-300 dark:border-amber-400 dark:bg-amber-400 dark:text-slate-950 dark:hover:border-amber-300 dark:hover:bg-amber-300 dark:hover:text-slate-950"
                  onClick={() => setArchiveOpen(true)}
                  aria-label={`Arkibkan aktiviti ${activity.title}`}
                >
                  <Archive className="size-4" aria-hidden="true" />
                  Diarkibkan
                </Button>
              ) : isArchived ? (
                <Button
                  type="button"
                  className="h-11 rounded-xl bg-secondary px-4 font-semibold text-secondary-foreground shadow-sm hover:bg-secondary/90"
                  onClick={() => setReactivateOpen(true)}
                  aria-label={`Aktifkan semula aktiviti ${activity.title}`}
                >
                  <RotateCcw className="size-4" aria-hidden="true" />
                  Aktifkan Semula
                </Button>
              ) : null}
              <Button asChild className="h-11 rounded-xl bg-primary px-4 font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 focus-visible:ring-primary/30">
                <Link to={`/admin/aktiviti/${activity.id}/cipta/maklumat`}>Edit</Link>
              </Button>
            </div>
            <Button asChild variant="outline" className="h-11 w-full rounded-xl px-4">
              <Link to={`/admin/aktiviti/${activity.id}/cipta/pratonton`}>Pratonton</Link>
            </Button>
          </div>
        </div>
      </article>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Padam aktiviti?"
        description={`Anda akan memadam aktiviti ini secara kekal.\n\nAktiviti: ${activity.title}\n\nAktiviti yang dipadam tidak boleh dipulihkan. Tindakan ini tidak boleh dibatalkan.`}
        confirmLabel="Padam Aktiviti"
        cancelLabel="Batal"
        variant="destructive"
        isLoading={deleteMutation.isPending}
        onConfirm={async () => {
          await deleteMutation.mutateAsync();
        }}
      />
      <ConfirmDialog
        open={archiveOpen}
        onOpenChange={(open) => {
          if (!archiveMutation.isPending) {
            setArchiveOpen(open);
          }
        }}
        title="Arkibkan aktiviti?"
        description={`Aktiviti ini akan dipindahkan ke status Diarkibkan dan tidak lagi tersedia sebagai aktiviti aktif. Anda boleh mengaktifkannya semula kemudian.\n\nAktiviti: ${activity.title}`}
        confirmLabel="Arkibkan Aktiviti"
        cancelLabel="Batal"
        isLoading={archiveMutation.isPending}
        onConfirm={async () => {
          await archiveMutation.mutateAsync();
        }}
      />
      <ConfirmDialog
        open={reactivateOpen}
        onOpenChange={(open) => {
          if (!reactivateMutation.isPending) {
            setReactivateOpen(open);
          }
        }}
        title="Aktifkan semula aktiviti?"
        description={`Aktiviti ini akan diaktifkan semula dan tersedia mengikut aliran penggunaan sistem.\n\nAktiviti: ${activity.title}`}
        confirmLabel="Aktifkan Semula"
        cancelLabel="Batal"
        isLoading={reactivateMutation.isPending}
        onConfirm={async () => {
          await reactivateMutation.mutateAsync();
        }}
      />
    </>
  );
}

export function AdminActivityList({
  activities,
  isLoading,
  meta,
  onPageChange,
}: {
  activities: AdminActivityRecord[];
  isLoading: boolean;
  meta: AdminActivityListResult["meta"] | undefined;
  onPageChange: (page: number) => void;
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
        <AdminActivityCard
          key={activity.id}
          activity={activity}
          currentPage={meta?.page ?? 1}
          pageSize={meta?.limit ?? (activities.length || 1)}
          totalItems={meta?.total ?? activities.length}
          onPageChange={onPageChange}
        />
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
          <AdminActivityList activities={activities?.items ?? []} isLoading={isLoading} meta={activities?.meta} onPageChange={(page) => onChange({ page })} />
        ) : null}

        {activities && total > 0 ? (
          <Pagination page={activities.meta.page} totalPages={activities.meta.totalPages} onPageChange={(page) => onChange({ page })} />
        ) : null}
      </div>
    </>
  );
}
