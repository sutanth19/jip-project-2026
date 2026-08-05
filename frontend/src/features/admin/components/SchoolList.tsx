import * as React from "react";
import { Eye, Plus, Search, SlidersHorizontal } from "lucide-react";
import { Link } from "react-router-dom";

import { EmptyState } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useDebouncedSearchInput } from "@/features/admin/hooks/use-debounced-search-input";
import type { AdminListQuery, AdminRecord, PageMeta } from "@/features/admin/types/admin.types";
import {
  getSchoolInitials,
  schoolLimitPatch,
  schoolPageSizeOptions,
  schoolResetPatch,
  schoolStatusLabel,
  schoolStatusPatch,
  toSchoolListItem,
  type SchoolListItem,
  type SchoolStatus,
} from "@/features/admin/utils/school-list";
import { adminAccountBadgeToneClasses, adminBadgeBaseClass } from "@/features/admin/utils/admin-status";
import { ApiError, parseApiError } from "@/lib/api";
import { cn } from "@/lib/utils";
import { formatDate } from "@/utils/date";

const schoolStatusOptions: { label: string; value: "all" | SchoolStatus }[] = [
  { label: "Semua status", value: "all" },
  { label: "Aktif", value: "ACTIVE" },
  { label: "Digantung", value: "SUSPENDED" },
  { label: "Diarkibkan", value: "ARCHIVED" },
];

export function SchoolStatusBadge({ status }: { status: SchoolStatus }) {
  return (
    <span
      className={cn(
        adminBadgeBaseClass,
        adminAccountBadgeToneClasses[status],
      )}
    >
      {schoolStatusLabel(status)}
    </span>
  );
}

function SchoolLogo({ school }: { school: SchoolListItem }) {
  const [logoOk, setLogoOk] = React.useState(Boolean(school.logo));
  const initials = getSchoolInitials(school.schoolName);

  if (school.logo && logoOk) {
    return (
      <img
        src={school.logo}
        alt=""
        className="size-11 rounded-xl object-cover"
        onError={() => setLogoOk(false)}
      />
    );
  }

  return (
    <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-sm font-bold text-indigo-700 dark:bg-indigo-400/15 dark:text-indigo-200">
      {initials}
    </span>
  );
}

function formattedCreatedAt(value: string | null): string {
  if (!value) return "Belum direkodkan";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Belum direkodkan" : formatDate(date);
}

function principalLabel(value: string | null): string {
  return value ?? "Belum ditetapkan";
}

function viewButton(path: string, school: SchoolListItem, fullWidth = false) {
  return (
    <Button
      asChild
      size="sm"
      className={cn(
        "h-10 min-w-[96px] gap-2 rounded-lg bg-primary px-4 font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 active:bg-primary/80 focus-visible:ring-primary/30",
        fullWidth && "w-full",
      )}
    >
      <Link to={`${path}/${school.id}`} aria-label={`Lihat ${school.schoolName}`}>
        <Eye className="size-4" aria-hidden="true" />
        Lihat
      </Link>
    </Button>
  );
}

export function SchoolListFilters({
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
        <span className="sr-only">Cari sekolah</span>
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
        <Input
          value={searchInput}
          onChange={handleSearchInputChange}
          placeholder="Cari sekolah mengikut nama, kod, pengetua, e-mel atau telefon."
          className="!bg-background/40 pl-9 text-foreground placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-primary/20"
        />
      </label>
      <label className="w-full text-sm sm:w-auto">
        <span className="sr-only">Status sekolah</span>
        <Select
          value={query.status ?? "all"}
          onValueChange={(value) => onChange(schoolStatusPatch(value))}
        >
          <SelectTrigger className="!bg-background/40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {schoolStatusOptions.map((status) => (
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
          onChange(schoolResetPatch());
        }}
      >
        <SlidersHorizontal className="size-4" aria-hidden="true" />
        Reset
      </Button>
    </div>
  );
}

export function SchoolListTable({ rows, path }: { rows: SchoolListItem[]; path: string }) {
  return (
    <div className="mt-5 hidden overflow-hidden rounded-2xl border border-border bg-card md:block">
      <table className="w-full border-collapse text-sm">
        <thead className="bg-muted/70 text-muted-foreground">
          <tr>
            <th scope="col" className="px-4 py-3 text-left font-medium">Sekolah</th>
            <th scope="col" className="px-4 py-3 text-left font-medium">Kod Sekolah</th>
            <th scope="col" className="px-4 py-3 text-left font-medium">Pengetua</th>
            <th scope="col" className="px-4 py-3 text-left font-medium">Telefon</th>
            <th scope="col" className="px-4 py-3 text-left font-medium">Status</th>
            <th scope="col" className="px-4 py-3 text-left font-medium">Tarikh Dicipta</th>
            <th scope="col" className="px-4 py-3 text-right font-medium">Tindakan</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((school) => (
            <tr key={school.id} className="border-t border-border hover:bg-muted/35">
              <td className="px-4 py-3">
                <div className="flex min-w-0 items-center gap-3">
                  <SchoolLogo school={school} />
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-foreground">{school.schoolName}</p>
                    {school.contactEmail ? <p className="truncate text-sm text-muted-foreground">{school.contactEmail}</p> : null}
                  </div>
                </div>
              </td>
              <td className="px-4 py-3 font-medium text-foreground">{school.schoolCode}</td>
              <td className="px-4 py-3 text-muted-foreground">{principalLabel(school.principalName)}</td>
              <td className="px-4 py-3 text-muted-foreground">{school.phone}</td>
              <td className="px-4 py-3"><SchoolStatusBadge status={school.accountStatus} /></td>
              <td className="px-4 py-3 text-muted-foreground">{formattedCreatedAt(school.createdAt)}</td>
              <td className="px-4 py-3 text-right">{viewButton(path, school)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function SchoolMobileCards({ rows, path }: { rows: SchoolListItem[]; path: string }) {
  return (
    <div className="mt-5 grid gap-3 md:hidden">
      {rows.map((school) => (
        <article key={school.id} className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-start gap-3">
            <SchoolLogo school={school} />
            <div className="min-w-0 flex-1">
              <h3 className="truncate text-base font-semibold text-foreground">{school.schoolName}</h3>
              <p className="text-sm font-medium text-muted-foreground">{school.schoolCode}</p>
              {school.contactEmail ? <p className="truncate text-sm text-muted-foreground">{school.contactEmail}</p> : null}
            </div>
          </div>
          <dl className="mt-4 grid gap-3 text-sm">
            <div className="flex items-center justify-between gap-3">
              <dt className="text-muted-foreground">Pengetua</dt>
              <dd className="text-right font-medium text-foreground">{principalLabel(school.principalName)}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-muted-foreground">Telefon</dt>
              <dd className="text-right font-medium text-foreground">{school.phone}</dd>
            </div>
          </dl>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <SchoolStatusBadge status={school.accountStatus} />
            {viewButton(path, school, true)}
          </div>
        </article>
      ))}
    </div>
  );
}

export function SchoolPagination({
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
        Menunjukkan {start}-{end} daripada {meta.total} sekolah
      </p>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
        <label className="flex flex-col gap-2 text-sm text-muted-foreground sm:flex-row sm:items-center">
          <span>Baris setiap halaman</span>
          <Select value={String(meta.limit)} onValueChange={(value) => onPageSizeChange(Number(value))}>
            <SelectTrigger className="!bg-background/40 sm:w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {schoolPageSizeOptions.map((size) => (
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

export function SchoolListLoading() {
  return (
    <div className="mt-6 space-y-5" aria-label="Memuatkan senarai sekolah">
      <div className="hidden overflow-hidden rounded-2xl border border-border bg-card md:block">
        <div className="grid grid-cols-7 gap-4 bg-muted/70 p-4">
          {Array.from({ length: 7 }).map((_, index) => <Skeleton key={index} className="h-4" />)}
        </div>
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="grid grid-cols-7 items-center gap-4 border-t border-border p-4">
            <div className="col-span-2 flex items-center gap-3">
              <Skeleton className="size-11 rounded-xl" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
            <Skeleton className="h-4" />
            <Skeleton className="h-4" />
            <Skeleton className="h-4" />
            <Skeleton className="h-8 rounded-full" />
            <Skeleton className="h-10 rounded-lg" />
          </div>
        ))}
      </div>
      <div className="grid gap-3 md:hidden">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="rounded-lg border border-border bg-card p-4">
            <div className="flex gap-3">
              <Skeleton className="size-11 rounded-xl" />
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

function schoolErrorMessage(error: unknown) {
  const parsed = parseApiError(error);

  if (parsed.status === 403) {
    return "Anda tidak mempunyai kebenaran untuk melihat halaman ini.";
  }

  if (parsed.status === 0 || parsed.code === "NETWORK_ERROR") {
    return "Perkhidmatan tidak dapat dihubungi buat sementara waktu.";
  }

  return "Tidak dapat memuatkan data sekolah. Sila cuba lagi.";
}

export function SchoolListError({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  return (
    <div className="mt-6 rounded-2xl border border-border bg-card p-6 text-center text-card-foreground">
      <h2 className="text-base font-semibold">{schoolErrorMessage(error)}</h2>
      <Button type="button" className="mt-4" onClick={onRetry}>
        Cuba Semula
      </Button>
    </div>
  );
}

export function SchoolListContent({
  rows,
  meta,
  query,
  path,
  isLoading,
  isError,
  error,
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
  const schools = rows.map(toSchoolListItem);
  const hasSearch = Boolean(query.search?.trim() || query.status);

  if (isError) {
    return (
      <>
        <SchoolListFilters query={query} onChange={onQueryChange} />
        <SchoolListError error={error ?? new ApiError("Tidak dapat memuatkan data sekolah.", 500)} onRetry={onRetry} />
      </>
    );
  }

  return (
    <>
      <SchoolListFilters query={query} onChange={onQueryChange} />
      {isLoading ? (
        <SchoolListLoading />
      ) : schools.length === 0 ? (
        <div className="mt-5">
          <EmptyState
            title={hasSearch ? "Tiada sekolah yang sepadan dengan carian." : "Belum ada sekolah."}
            action={
              hasSearch ? (
                <Button type="button" variant="outline" onClick={() => onQueryChange(schoolResetPatch())}>
                  Reset carian
                </Button>
              ) : canCreate ? (
                <Button asChild variant="secondary">
                  <Link
                    to={`${path}/tambah`}
                    className="h-12 rounded-xl px-6 font-semibold shadow-sm hover:bg-secondary/90 focus-visible:ring-secondary/30"
                  >
                    <Plus className="size-4" aria-hidden="true" />
                    Tambah Sekolah
                  </Link>
                </Button>
              ) : undefined
            }
          />
        </div>
      ) : (
        <>
          <SchoolListTable rows={schools} path={path} />
          <SchoolMobileCards rows={schools} path={path} />
          <SchoolPagination
            meta={meta}
            onPageChange={(page) => onQueryChange({ page })}
            onPageSizeChange={(limit) => onQueryChange(schoolLimitPatch(limit))}
          />
        </>
      )}
    </>
  );
}
