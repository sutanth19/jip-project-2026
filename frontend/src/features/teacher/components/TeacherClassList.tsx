import { Eye, Plus, Search, SlidersHorizontal, School } from "lucide-react";
import { Link } from "react-router-dom";

import { EmptyState, ErrorState } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { AdminAccountStatusBadge } from "@/features/admin/components/AdminAccountStatusBadge";
import { useDebouncedSearchInput } from "@/features/admin/hooks/use-debounced-search-input";
import type { TeacherClassListItem, TeacherClassListQuery } from "@/features/teacher/types/teacher-class.types";
import {
  defaultTeacherClassQuery,
  teacherClassDisplayLabel,
  teacherClassPageSizeOptions,
  teacherClassStatusOptions,
  teacherClassYearLabel,
  teacherYearLevelOptions,
} from "@/features/teacher/utils/teacher-class";
import { cn } from "@/lib/utils";

type TeacherClassFiltersProps = {
  query: Partial<TeacherClassListQuery>;
  academicYearOptions: number[];
  onChange: (patch: Partial<TeacherClassListQuery>) => void;
};

function viewPath(id: string) {
  return `/guru/kelas/${id}`;
}

function resetQuery(): Partial<TeacherClassListQuery> {
  return {
    search: undefined,
    yearLevel: undefined,
    status: undefined,
    academicYear: defaultTeacherClassQuery.academicYear,
    page: 1,
  };
}

function ViewButton({ classId, className, fullWidth = false }: { classId: string; className: string; fullWidth?: boolean }) {
  return (
    <Button
      asChild
      size="sm"
      className={cn(
        "h-10 min-w-[96px] gap-2 rounded-lg bg-primary px-4 font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 active:bg-primary/80 focus-visible:ring-primary/30",
        fullWidth && "w-full",
      )}
    >
      <Link to={viewPath(classId)} aria-label={`Lihat kelas ${className}`}>
        <Eye className="size-4" aria-hidden="true" />
        Lihat
      </Link>
    </Button>
  );
}

export function TeacherClassListFilters({ query, academicYearOptions, onChange }: TeacherClassFiltersProps) {
  const { searchInput, handleSearchInputChange, resetSearchInput } = useDebouncedSearchInput({
    value: query.search,
    onChange: (patch) => onChange(patch as Partial<TeacherClassListQuery>),
  });

  return (
    <div className="mt-6 flex flex-col gap-3 lg:flex-row lg:items-center">
      <label className="relative flex-1">
        <span className="sr-only">Cari kelas</span>
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
        <Input
          value={searchInput}
          onChange={handleSearchInputChange}
          placeholder="Cari kelas mengikut nama kelas atau tahun."
          className="!bg-background/40 pl-9 text-foreground placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-primary/20"
          aria-label="Cari kelas mengikut nama kelas atau tahun."
        />
      </label>
      <label className="w-full text-sm sm:w-auto">
        <span className="sr-only">Tahun</span>
        <Select value={query.yearLevel ? String(query.yearLevel) : "all"} onValueChange={(value) => onChange({ yearLevel: value === "all" ? undefined : Number(value), page: 1 })}>
          <SelectTrigger className="!bg-background/40 sm:w-40">
            <SelectValue placeholder="Semua tahun" />
          </SelectTrigger>
          <SelectContent>
            {teacherYearLevelOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </label>
      <label className="w-full text-sm sm:w-auto">
        <span className="sr-only">Sesi akademik</span>
        <Select value={query.academicYear ? String(query.academicYear) : "all"} onValueChange={(value) => onChange({ academicYear: value === "all" ? undefined : Number(value), page: 1 })}>
          <SelectTrigger className="!bg-background/40 sm:w-44">
            <SelectValue placeholder="Sesi Akademik" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua sesi</SelectItem>
            {academicYearOptions.map((year) => (
              <SelectItem key={year} value={String(year)}>
                {year}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </label>
      <label className="w-full text-sm sm:w-auto">
        <span className="sr-only">Status</span>
        <Select value={query.status ?? "all"} onValueChange={(value) => onChange({ status: value === "all" ? undefined : value as TeacherClassListQuery["status"], page: 1 })}>
          <SelectTrigger className="!bg-background/40 sm:w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {teacherClassStatusOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
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
          onChange(resetQuery());
        }}
      >
        <SlidersHorizontal className="size-4" aria-hidden="true" />
        Reset
      </Button>
    </div>
  );
}

export function TeacherClassListTable({ rows }: { rows: TeacherClassListItem[] }) {
  return (
    <div className="mt-5 hidden overflow-hidden rounded-2xl border border-border bg-card md:block">
      <table className="w-full border-collapse text-sm">
        <thead className="bg-muted/70 text-muted-foreground">
          <tr>
            <th scope="col" className="w-[30%] px-4 py-3 text-left font-medium">Kelas</th>
            <th scope="col" className="w-[14%] px-4 py-3 text-left font-medium">Tahun</th>
            <th scope="col" className="w-[16%] px-4 py-3 text-left font-medium">Sesi Akademik</th>
            <th scope="col" className="w-[16%] px-4 py-3 text-left font-medium">Bilangan Murid</th>
            <th scope="col" className="w-[14%] px-4 py-3 text-left font-medium">Status</th>
            <th scope="col" className="w-32 px-4 py-3 text-right font-medium">Tindakan</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((item) => (
            <tr key={item.id} className="border-t border-border hover:bg-muted/35">
              <td className="px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-foreground">{item.className}</p>
                  <p className="truncate text-sm text-muted-foreground">{teacherClassDisplayLabel(item)}</p>
                </div>
              </td>
              <td className="px-4 py-3 text-foreground">{teacherClassYearLabel(item.yearLevel)}</td>
              <td className="px-4 py-3 text-muted-foreground">{item.academicYear}</td>
              <td className="px-4 py-3 text-foreground">{item.studentCount}</td>
              <td className="px-4 py-3"><AdminAccountStatusBadge status={item.accountStatus} /></td>
              <td className="px-4 py-3 text-right"><ViewButton classId={item.id} className={item.className} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function TeacherClassMobileCards({ rows }: { rows: TeacherClassListItem[] }) {
  return (
    <div className="mt-5 grid gap-3 md:hidden">
      {rows.map((item) => (
        <article key={item.id} className="rounded-lg border border-border bg-card p-4">
          <div className="min-w-0">
            <h3 className="break-words text-base font-semibold text-foreground">{teacherClassDisplayLabel(item)}</h3>
            <p className="text-sm text-muted-foreground">{teacherClassYearLabel(item.yearLevel)}</p>
          </div>
          <dl className="mt-4 grid gap-3 text-sm">
            <div className="flex items-center justify-between gap-3">
              <dt className="text-muted-foreground">Sesi Akademik</dt>
              <dd className="text-right font-medium text-foreground">{item.academicYear}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-muted-foreground">Bilangan Murid</dt>
              <dd className="text-right font-medium text-foreground">{item.studentCount}</dd>
            </div>
          </dl>
          <div className="mt-4 flex flex-col gap-3">
            <AdminAccountStatusBadge status={item.accountStatus} />
            <ViewButton classId={item.id} className={item.className} fullWidth />
          </div>
        </article>
      ))}
    </div>
  );
}

export function TeacherClassPagination({
  page,
  limit,
  total,
  totalPages,
  onPageChange,
  onPageSizeChange,
}: {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (limit: number) => void;
}) {
  const safeTotalPages = Math.max(totalPages, 1);
  const start = total === 0 ? 0 : (page - 1) * limit + 1;
  const end = Math.min(page * limit, total);

  return (
    <div className="mt-6 flex flex-col items-stretch gap-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-muted-foreground">Menunjukkan {start}-{end} daripada {total} kelas</p>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
        <label className="flex flex-col gap-2 text-sm text-muted-foreground sm:flex-row sm:items-center">
          <span>Baris setiap halaman</span>
          <Select value={String(limit)} onValueChange={(value) => onPageSizeChange(Number(value))}>
            <SelectTrigger className="!bg-background/40 sm:w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {teacherClassPageSizeOptions.map((size) => (
                <SelectItem key={size} value={String(size)}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>
        <div className="flex items-center justify-between gap-3 sm:justify-end">
          <Button type="button" variant="outline" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
            Sebelum
          </Button>
          <span className="text-sm text-muted-foreground">Halaman {page} daripada {safeTotalPages}</span>
          <Button type="button" variant="outline" disabled={page >= safeTotalPages} onClick={() => onPageChange(page + 1)}>
            Seterus
          </Button>
        </div>
      </div>
    </div>
  );
}

export function TeacherClassListLoading() {
  return (
    <div className="mt-6 space-y-5" aria-busy="true" aria-label="Memuatkan senarai kelas">
      <div className="hidden overflow-hidden rounded-2xl border border-border bg-card md:block">
        <div className="grid grid-cols-[1.5fr_0.8fr_0.9fr_0.9fr_0.8fr_auto] gap-4 bg-muted/70 p-4">
          {Array.from({ length: 6 }).map((_, index) => <Skeleton key={index} className="h-4" />)}
        </div>
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="grid grid-cols-[1.5fr_0.8fr_0.9fr_0.9fr_0.8fr_auto] items-center gap-4 border-t border-border p-4">
            <div className="space-y-2">
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-3 w-1/3" />
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
            <Skeleton className="h-5 w-1/2" />
            <Skeleton className="mt-2 h-4 w-1/3" />
            <Skeleton className="mt-4 h-10 w-full" />
          </div>
        ))}
      </div>
      <Skeleton className="h-10 w-full sm:ml-auto sm:w-96" />
    </div>
  );
}

export function TeacherClassNoSchoolState() {
  return (
    <EmptyState
      icon={<School className="size-5" aria-hidden="true" />}
      title="Sekolah belum ditetapkan"
      description="Guru ini belum dipautkan kepada sekolah. Hubungi pentadbir untuk menetapkan sekolah."
    />
  );
}

export function TeacherClassEmptyState({
  hasFilters,
  canCreate,
}: {
  hasFilters: boolean;
  canCreate: boolean;
}) {
  return (
    <EmptyState
      title="Tiada kelas ditemui"
      description={
        hasFilters
          ? "Tiada kelas yang sepadan dengan carian atau penapis semasa."
          : "Tambah kelas pertama untuk mula menguruskan murid."
      }
      action={
        !hasFilters && canCreate ? (
          <Button asChild variant="secondary">
            <Link
              to="/guru/kelas/tambah"
              className="h-12 rounded-xl px-6 font-semibold shadow-sm hover:bg-secondary/90 focus-visible:ring-secondary/30"
            >
              <Plus className="size-4" aria-hidden="true" />
              Tambah Kelas
            </Link>
          </Button>
        ) : null
      }
    />
  );
}

export function TeacherClassFilteredEmptyState({ onReset }: { onReset: () => void }) {
  return (
    <EmptyState
      title="Tiada kelas ditemui"
      description="Tiada kelas yang sepadan dengan carian atau penapis semasa."
      action={
        <Button type="button" variant="outline" onClick={onReset}>
          Reset Penapis
        </Button>
      }
    />
  );
}

export function TeacherClassErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <ErrorState
      title="Kelas tidak dapat dimuatkan."
      description="Sila cuba semula. Jika masalah berterusan, hubungi pentadbir sistem."
      actionLabel="Cuba Semula"
      onAction={onRetry}
    />
  );
}
