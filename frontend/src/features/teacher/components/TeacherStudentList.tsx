import { Eye, Plus, Search, SlidersHorizontal, School, Users } from "lucide-react";
import { Link } from "react-router-dom";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { EmptyState, ErrorState } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { AdminAccountStatusBadge } from "@/features/admin/components/AdminAccountStatusBadge";
import { useDebouncedSearchInput } from "@/features/admin/hooks/use-debounced-search-input";
import type { TeacherClassListItem } from "@/features/teacher/types/teacher-class.types";
import type { TeacherStudentListItem, TeacherStudentListQuery } from "@/features/teacher/types/teacher-student.types";
import { teacherClassDisplayLabel, teacherYearLevelOptions } from "@/features/teacher/utils/teacher-class";
import {
  teacherStudentClassLabel,
  teacherStudentInitials,
  teacherStudentPageSizeOptions,
  teacherStudentRemedialSkillLabel,
  teacherStudentResetQuery,
  teacherStudentStatusOptions,
  teacherStudentYearLabel,
} from "@/features/teacher/utils/teacher-student";
import { cn } from "@/lib/utils";

type TeacherStudentFiltersProps = {
  query: Partial<TeacherStudentListQuery>;
  classes: TeacherClassListItem[];
  classOptionsLoading: boolean;
  onChange: (patch: Partial<TeacherStudentListQuery>) => void;
};

function viewPath(id: string) {
  return `/guru/murid/${id}`;
}

function createPath() {
  return "/guru/murid/tambah";
}

function ViewButton({ studentId, fullName, fullWidth = false }: { studentId: string; fullName: string; fullWidth?: boolean }) {
  return (
    <Button
      asChild
      size="sm"
      className={cn(
        "h-10 min-w-[96px] gap-2 rounded-lg bg-primary px-4 font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 active:bg-primary/80 focus-visible:ring-primary/30",
        fullWidth && "w-full",
      )}
    >
      <Link to={viewPath(studentId)} aria-label={`Lihat murid ${fullName}`}>
        <Eye className="size-4" aria-hidden="true" />
        Lihat
      </Link>
    </Button>
  );
}

export function AddStudentButton({ fullWidth = false }: { fullWidth?: boolean }) {
  return (
    <Button asChild variant="secondary">
      <Link
        to={createPath()}
        className={cn(
          "h-12 rounded-xl px-6 font-semibold shadow-sm hover:bg-secondary/90 focus-visible:ring-secondary/30",
          fullWidth && "w-full",
        )}
      >
        <Plus className="size-4" aria-hidden="true" />
        Tambah Murid
      </Link>
    </Button>
  );
}

function RemedialLevelBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex h-8 min-w-[128px] items-center justify-center rounded-full border border-border bg-muted/40 px-3 text-sm font-semibold text-muted-foreground shadow-sm">
      {label}
    </span>
  );
}

function StudentIdentity({ item }: { item: TeacherStudentListItem }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <Avatar className="size-11">
        {item.avatar ? <AvatarImage src={item.avatar} alt="" /> : null}
        <AvatarFallback className="bg-secondary/10 font-semibold text-secondary">{teacherStudentInitials(item.fullName)}</AvatarFallback>
      </Avatar>
      <div className="min-w-0">
        <p className="break-words font-semibold text-foreground">{item.fullName}</p>
        <p className="mt-1 truncate text-sm text-muted-foreground">{item.studentId || "ID murid tidak tersedia"}</p>
      </div>
    </div>
  );
}

export function TeacherStudentListFilters({ query, classes, classOptionsLoading, onChange }: TeacherStudentFiltersProps) {
  const { searchInput, handleSearchInputChange, resetSearchInput } = useDebouncedSearchInput({
    value: query.search,
    onChange: (patch) => onChange(patch as Partial<TeacherStudentListQuery>),
  });
  const classOptions = query.yearLevel ? classes.filter((item) => item.yearLevel === query.yearLevel) : classes;

  return (
    <div className="mt-6 flex flex-col gap-3 xl:flex-row xl:items-center">
      <label className="relative flex-1">
        <span className="sr-only">Cari murid</span>
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
        <Input
          value={searchInput}
          onChange={handleSearchInputChange}
          placeholder="Cari murid mengikut nama, ID murid atau kelas asal."
          className="!bg-background/40 pl-9 text-foreground placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-primary/20"
          aria-label="Cari murid mengikut nama, ID murid atau kelas asal."
        />
      </label>
      <label className="w-full text-sm sm:w-auto">
        <span className="sr-only">Tahun</span>
        <Select
          value={query.yearLevel ? String(query.yearLevel) : "all"}
          onValueChange={(value) => onChange({ yearLevel: value === "all" ? undefined : Number(value), classId: undefined, page: 1 })}
        >
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
        <span className="sr-only">Kelas asal</span>
        <Select value={query.classId ?? "all"} onValueChange={(value) => onChange({ classId: value === "all" ? undefined : value, page: 1 })} disabled={classOptionsLoading}>
          <SelectTrigger className="!bg-background/40 sm:w-44">
            <SelectValue placeholder="Semua kelas" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua kelas</SelectItem>
            {classOptions.map((item) => (
              <SelectItem key={item.id} value={item.id}>
                {teacherClassDisplayLabel(item)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </label>
      <label className="w-full text-sm sm:w-auto">
        <span className="sr-only">Tahap Pemulihan</span>
        <Select value="unavailable" disabled>
          <SelectTrigger className="!bg-background/40 sm:w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="unavailable">Belum tersedia</SelectItem>
          </SelectContent>
        </Select>
      </label>
      <label className="w-full text-sm sm:w-auto">
        <span className="sr-only">Status</span>
        <Select value={query.status ?? "all"} onValueChange={(value) => onChange({ status: value === "all" ? undefined : value as TeacherStudentListQuery["status"], page: 1 })}>
          <SelectTrigger className="!bg-background/40 sm:w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {teacherStudentStatusOptions.map((option) => (
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
          onChange(teacherStudentResetQuery());
        }}
      >
        <SlidersHorizontal className="size-4" aria-hidden="true" />
        Reset
      </Button>
    </div>
  );
}

export function TeacherStudentListTable({ rows }: { rows: TeacherStudentListItem[] }) {
  return (
    <div className="mt-5 hidden overflow-hidden rounded-2xl border border-border bg-card md:block">
      <table className="w-full border-collapse text-sm">
        <thead className="bg-muted/70 text-muted-foreground">
          <tr>
            <th scope="col" className="w-[30%] px-4 py-3 text-left font-medium">Murid</th>
            <th scope="col" className="w-[14%] px-4 py-3 text-left font-medium">Tahun</th>
            <th scope="col" className="w-[18%] px-4 py-3 text-left font-medium">Kelas Asal</th>
            <th scope="col" className="w-[18%] px-4 py-3 text-left font-medium">Tahap Pemulihan</th>
            <th scope="col" className="w-[12%] px-4 py-3 text-left font-medium">Status</th>
            <th scope="col" className="w-32 px-4 py-3 text-right font-medium">Tindakan</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((item) => (
            <tr key={item.id} className="border-t border-border hover:bg-muted/35">
              <td className="px-4 py-3"><StudentIdentity item={item} /></td>
              <td className="px-4 py-3 text-foreground">{teacherStudentYearLabel(item.class?.yearLevel)}</td>
              <td className="px-4 py-3 text-foreground">{teacherStudentClassLabel(item)}</td>
              <td className="px-4 py-3"><RemedialLevelBadge label={teacherStudentRemedialSkillLabel(item.remedialSkill)} /></td>
              <td className="px-4 py-3"><AdminAccountStatusBadge status={item.accountStatus} /></td>
              <td className="px-4 py-3 text-right"><ViewButton studentId={item.id} fullName={item.fullName} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function TeacherStudentMobileCards({ rows }: { rows: TeacherStudentListItem[] }) {
  return (
    <div className="mt-5 grid gap-3 md:hidden">
      {rows.map((item) => (
        <article key={item.id} className="rounded-lg border border-border bg-card p-4">
          <StudentIdentity item={item} />
          <dl className="mt-4 grid gap-3 text-sm">
            <div className="flex items-center justify-between gap-3">
              <dt className="text-muted-foreground">Tahun</dt>
              <dd className="text-right font-medium text-foreground">{teacherStudentYearLabel(item.class?.yearLevel)}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-muted-foreground">Kelas Asal</dt>
              <dd className="text-right font-medium text-foreground">{teacherStudentClassLabel(item)}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-muted-foreground">Tahap Pemulihan</dt>
              <dd><RemedialLevelBadge label={teacherStudentRemedialSkillLabel(item.remedialSkill)} /></dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-muted-foreground">Status</dt>
              <dd><AdminAccountStatusBadge status={item.accountStatus} /></dd>
            </div>
          </dl>
          <div className="mt-4">
            <ViewButton studentId={item.id} fullName={item.fullName} fullWidth />
          </div>
        </article>
      ))}
    </div>
  );
}

export function TeacherStudentPagination({
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
      <p className="text-sm text-muted-foreground">Menunjukkan {start}-{end} daripada {total} murid</p>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
        <label className="flex flex-col gap-2 text-sm text-muted-foreground sm:flex-row sm:items-center">
          <span>Baris setiap halaman</span>
          <Select value={String(limit)} onValueChange={(value) => onPageSizeChange(Number(value))}>
            <SelectTrigger className="!bg-background/40 sm:w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {teacherStudentPageSizeOptions.map((size) => (
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

export function TeacherStudentListLoading() {
  return (
    <div className="mt-6 space-y-5" aria-busy="true" aria-label="Memuatkan senarai murid">
      <div className="hidden overflow-hidden rounded-2xl border border-border bg-card md:block">
        <div className="grid grid-cols-[1.5fr_0.7fr_0.9fr_1fr_0.8fr_auto] gap-4 bg-muted/70 p-4">
          {Array.from({ length: 6 }).map((_, index) => <Skeleton key={index} className="h-4" />)}
        </div>
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="grid grid-cols-[1.5fr_0.7fr_0.9fr_1fr_0.8fr_auto] items-center gap-4 border-t border-border p-4">
            <div className="flex items-center gap-3">
              <Skeleton className="size-11 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
            <Skeleton className="h-4" />
            <Skeleton className="h-4" />
            <Skeleton className="h-8 rounded-full" />
            <Skeleton className="h-8 rounded-full" />
            <Skeleton className="h-10 rounded-lg" />
          </div>
        ))}
      </div>
      <div className="grid gap-3 md:hidden">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="rounded-lg border border-border bg-card p-4">
            <div className="flex items-center gap-3">
              <Skeleton className="size-11 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-24" />
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

export function TeacherStudentNoSchoolState() {
  return (
    <EmptyState
      icon={<School className="size-5" aria-hidden="true" />}
      title="Sekolah belum ditetapkan"
      description="Guru ini belum dipautkan kepada sekolah. Hubungi pentadbir untuk menetapkan sekolah."
    />
  );
}

export function TeacherStudentEmptyState({ canCreate }: { canCreate: boolean }) {
  return (
    <EmptyState
      icon={<Users className="size-5" aria-hidden="true" />}
      title="Tiada murid ditemui"
      description="Tambah murid pertama untuk mula menguruskan Program Pemulihan Khas."
      action={canCreate ? <AddStudentButton /> : null}
    />
  );
}

export function TeacherStudentFilteredEmptyState({ onReset }: { onReset: () => void }) {
  return (
    <EmptyState
      title="Tiada murid ditemui"
      description="Tiada murid yang sepadan dengan carian atau penapis semasa."
      action={
        <Button type="button" variant="outline" onClick={onReset}>
          Reset Penapis
        </Button>
      }
    />
  );
}

export function TeacherStudentErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <ErrorState
      title="Murid tidak dapat dimuatkan"
      description="Sila cuba semula. Jika masalah berterusan, hubungi pentadbir sistem."
      actionLabel="Cuba Semula"
      onAction={onRetry}
    />
  );
}
