import { Eye, Plus, Search, SlidersHorizontal } from "lucide-react";
import { Link } from "react-router-dom";

import { EmptyState, ErrorState } from "@/components/shared";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { AdminAccountStatusBadge } from "@/features/admin/components/AdminAccountStatusBadge";
import { useDebouncedSearchInput } from "@/features/admin/hooks/use-debounced-search-input";
import type { AdminListQuery, AdminRecord, PageMeta } from "@/features/admin/types/admin.types";
import { adminPageSizeOptions } from "@/features/admin/utils/admin-status";
import {
  getTeacherInitials,
  teacherLimitPatch,
  teacherResetPatch,
  teacherStatusFilterOptions,
  teacherStatusPatch,
  toTeacherListItem,
  type TeacherListItem,
} from "@/features/admin/utils/teacher-list";
import { cn } from "@/lib/utils";
import { formatDate } from "@/utils/date";

function fallback(value: string | null): string {
  return value ?? "—";
}

function lastLoginLabel(value: string | null): string {
  return value ? formatDate(value) : "Belum pernah";
}

function TeacherAvatar({ teacher }: { teacher: TeacherListItem }) {
  return (
    <Avatar>
      <AvatarImage src={teacher.avatar ?? undefined} alt={teacher.fullName} />
      <AvatarFallback>{getTeacherInitials(teacher.fullName)}</AvatarFallback>
    </Avatar>
  );
}

function ViewButton({
  teacher,
  path,
  fullWidth = false,
}: {
  teacher: TeacherListItem;
  path: string;
  fullWidth?: boolean;
}) {
  return (
    <Button
      asChild
      size="sm"
      className={cn(
        "h-10 min-w-[96px] gap-2 rounded-lg bg-primary px-4 font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 active:bg-primary/80 focus-visible:ring-primary/30",
        fullWidth && "w-full",
      )}
    >
      <Link to={`${path}/${teacher.id}`} aria-label={`Lihat ${teacher.fullName}`}>
        <Eye className="size-4" aria-hidden="true" />
        Lihat
      </Link>
    </Button>
  );
}

export function TeacherListFilters({
  query,
  onChange,
}: {
  query: AdminListQuery;
  onChange: (patch: AdminListQuery) => void;
}) {
  const {
    searchInput,
    handleSearchInputChange,
    resetSearchInput,
  } = useDebouncedSearchInput({ value: query.search, onChange });

  return (
    <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
      <label className="relative flex-1">
        <span className="sr-only">Cari guru</span>
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
        <Input
          value={searchInput}
          onChange={handleSearchInputChange}
          placeholder="Cari guru mengikut nama, e-mel atau sekolah."
          className="!bg-background/40 pl-9 text-foreground placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-primary/20"
        />
      </label>
      <label className="w-full text-sm sm:w-auto">
        <span className="sr-only">Status guru</span>
        <Select value={query.status ?? "all"} onValueChange={(value) => onChange(teacherStatusPatch(value))}>
          <SelectTrigger className="!bg-background/40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {teacherStatusFilterOptions.map((status) => (
              <SelectItem key={status.value} value={status.value}>
                {status.label}
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
          onChange(teacherResetPatch());
        }}
      >
        <SlidersHorizontal className="size-4" aria-hidden="true" />
        Reset
      </Button>
    </div>
  );
}

export function TeacherListTable({ rows, path }: { rows: TeacherListItem[]; path: string }) {
  return (
    <div className="mt-5 hidden overflow-hidden rounded-2xl border border-border bg-card md:block">
      <table className="w-full border-collapse text-sm">
        <thead className="bg-muted/70 text-muted-foreground">
          <tr>
            <th scope="col" className="w-[26%] px-4 py-3 text-left font-medium">Guru</th>
            <th scope="col" className="w-[24%] px-4 py-3 text-left font-medium">E-mel</th>
            <th scope="col" className="w-[20%] px-4 py-3 text-left font-medium">Sekolah</th>
            <th scope="col" className="w-[12%] px-4 py-3 text-left font-medium">Status</th>
            <th scope="col" className="w-[18%] whitespace-nowrap px-4 py-3 text-left font-medium">Log Masuk Terakhir</th>
            <th scope="col" className="w-32 px-4 py-3 text-right font-medium">Tindakan</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((teacher) => (
            <tr key={teacher.id} className="border-t border-border hover:bg-muted/35">
              <td className="px-4 py-3">
                <div className="flex min-w-0 items-center gap-3">
                  <TeacherAvatar teacher={teacher} />
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-foreground">{teacher.fullName}</p>
                    {teacher.teacherId ? <p className="truncate text-sm text-muted-foreground">{teacher.teacherId}</p> : null}
                  </div>
                </div>
              </td>
              <td className="px-4 py-3 text-muted-foreground">{fallback(teacher.email)}</td>
              <td className="truncate px-4 py-3 font-medium text-foreground">{teacher.school.schoolName ?? "Belum ditetapkan"}</td>
              <td className="px-4 py-3"><AdminAccountStatusBadge status={teacher.accountStatus} /></td>
              <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{lastLoginLabel(teacher.lastLogin)}</td>
              <td className="px-4 py-3 text-right"><ViewButton teacher={teacher} path={path} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function TeacherMobileCards({ rows, path }: { rows: TeacherListItem[]; path: string }) {
  return (
    <div className="mt-5 grid gap-3 md:hidden">
      {rows.map((teacher) => (
        <article key={teacher.id} className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-start gap-3">
            <TeacherAvatar teacher={teacher} />
            <div className="min-w-0 flex-1">
              <h3 className="truncate text-base font-semibold text-foreground">{teacher.fullName}</h3>
              {teacher.teacherId ? <p className="text-sm font-medium text-muted-foreground">{teacher.teacherId}</p> : null}
              <p className="truncate text-sm text-muted-foreground">{fallback(teacher.email)}</p>
            </div>
          </div>
          <dl className="mt-4 grid gap-3 text-sm">
            <div className="flex items-start justify-between gap-3">
              <dt className="text-muted-foreground">Sekolah</dt>
              <dd className="min-w-0 text-right font-medium text-foreground">
                <span className="block truncate">{teacher.school.schoolName ?? "Belum ditetapkan"}</span>
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-muted-foreground">Log Masuk Terakhir</dt>
              <dd className="text-right font-medium text-foreground">{lastLoginLabel(teacher.lastLogin)}</dd>
            </div>
          </dl>
          <div className="mt-4 flex flex-wrap gap-2">
            <AdminAccountStatusBadge status={teacher.accountStatus} />
          </div>
          <div className="mt-4">
            <ViewButton teacher={teacher} path={path} fullWidth />
          </div>
        </article>
      ))}
    </div>
  );
}

export function TeacherPagination({
  meta,
  onPageChange,
  onPageSizeChange,
}: {
  meta: PageMeta;
  onPageChange: (page: number) => void;
  onPageSizeChange: (limit: number) => void;
}) {
  const totalPages = Math.max(meta.totalPages, 1);
  const start = meta.total === 0 ? 0 : (meta.page - 1) * meta.limit + 1;
  const end = Math.min(meta.page * meta.limit, meta.total);

  return (
    <div className="mt-6 flex flex-col items-stretch gap-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-muted-foreground">
        Menunjukkan {start}-{end} daripada {meta.total} guru
      </p>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
        <label className="flex flex-col gap-2 text-sm text-muted-foreground sm:flex-row sm:items-center">
          <span>Baris setiap halaman</span>
          <Select value={String(meta.limit)} onValueChange={(value) => onPageSizeChange(Number(value))}>
            <SelectTrigger className="!bg-background/40 sm:w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {adminPageSizeOptions.map((size) => (
                <SelectItem key={size} value={String(size)}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>
        <div className="flex items-center justify-between gap-3 sm:justify-end">
          <Button type="button" variant="outline" disabled={meta.page <= 1} onClick={() => onPageChange(meta.page - 1)}>
            Sebelum
          </Button>
          <span className="text-sm text-muted-foreground">
            Halaman {meta.page} daripada {totalPages}
          </span>
          <Button type="button" variant="outline" disabled={meta.page >= totalPages} onClick={() => onPageChange(meta.page + 1)}>
            Seterus
          </Button>
        </div>
      </div>
    </div>
  );
}

export function TeacherListLoading() {
  return (
    <div className="mt-6 space-y-5" aria-busy="true" aria-label="Memuatkan senarai guru">
      <div className="hidden overflow-hidden rounded-2xl border border-border bg-card md:block">
        <div className="grid grid-cols-[1.5fr_1.35fr_1.15fr_auto_1fr_auto] gap-4 bg-muted/70 p-4">
          {Array.from({ length: 6 }).map((_, index) => <Skeleton key={index} className="h-4" />)}
        </div>
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="grid grid-cols-[1.5fr_1.35fr_1.15fr_auto_1fr_auto] items-center gap-4 border-t border-border p-4">
            <div className="flex items-center gap-3">
              <Skeleton className="size-10 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
            <Skeleton className="h-4" />
            <Skeleton className="h-4" />
            <Skeleton className="h-8 rounded-full" />
            <Skeleton className="h-4" />
            <Skeleton className="h-10 rounded-lg" />
          </div>
        ))}
      </div>
      <div className="grid gap-3 md:hidden">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="rounded-lg border border-border bg-card p-4">
            <div className="flex gap-3">
              <Skeleton className="size-10 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-3 w-1/3" />
              </div>
            </div>
            <Skeleton className="mt-4 h-10 w-full" />
          </div>
        ))}
      </div>
      <Skeleton className="h-10 w-full sm:ml-auto sm:w-96" />
    </div>
  );
}

export function TeacherListContent({
  rows,
  meta,
  query,
  path,
  isLoading,
  isError,
  canCreate,
  onQueryChange,
  onRetry,
}: {
  rows: AdminRecord[];
  meta: PageMeta;
  query: AdminListQuery;
  path: string;
  isLoading: boolean;
  isError: boolean;
  error?: unknown;
  canCreate: boolean;
  onQueryChange: (patch: AdminListQuery) => void;
  onRetry: () => void;
}) {
  const teachers = rows.map(toTeacherListItem);
  const hasFilters = Boolean(query.search?.trim() || query.status || query.schoolId || query.position);

  if (isError) {
    return (
      <>
        <TeacherListFilters query={query} onChange={onQueryChange} />
        <div className="mt-6">
          <ErrorState
            title="Maklumat guru tidak dapat dimuatkan."
            description="Sila cuba semula sebentar lagi."
            actionLabel="Cuba Lagi"
            onAction={onRetry}
          />
        </div>
      </>
    );
  }

  return (
    <>
      <TeacherListFilters query={query} onChange={onQueryChange} />
      {isLoading ? (
        <TeacherListLoading />
      ) : teachers.length === 0 ? (
        <div className="mt-5">
          <EmptyState
            title={hasFilters ? "Tiada guru ditemui" : "Belum ada guru"}
            description={hasFilters ? "Cuba ubah kata carian atau penapis status." : "Tambah guru pertama untuk mula mengurus akaun guru."}
            action={
              hasFilters ? (
                <Button type="button" variant="outline" onClick={() => onQueryChange(teacherResetPatch())}>
                  Reset Penapis
                </Button>
              ) : canCreate ? (
                <Button asChild variant="secondary">
                  <Link
                    to={`${path}/tambah`}
                    className="h-12 rounded-xl px-6 font-semibold shadow-sm hover:bg-secondary/90 focus-visible:ring-secondary/30"
                  >
                    <Plus className="size-4" aria-hidden="true" />
                    Tambah Guru
                  </Link>
                </Button>
              ) : undefined
            }
          />
        </div>
      ) : (
        <>
          <TeacherListTable rows={teachers} path={path} />
          <TeacherMobileCards rows={teachers} path={path} />
          <TeacherPagination
            meta={meta}
            onPageChange={(page) => onQueryChange({ page })}
            onPageSizeChange={(limit) => onQueryChange(teacherLimitPatch(limit))}
          />
        </>
      )}
    </>
  );
}
