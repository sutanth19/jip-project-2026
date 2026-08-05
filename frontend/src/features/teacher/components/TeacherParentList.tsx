import { Eye, Plus, Search, SlidersHorizontal, Users } from "lucide-react";
import { Link } from "react-router-dom";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/shared";
import { AdminAccountStatusBadge } from "@/features/admin/components/AdminAccountStatusBadge";
import { useDebouncedSearchInput } from "@/features/admin/hooks/use-debounced-search-input";
import type { TeacherParentListItem, TeacherParentListQuery } from "@/features/teacher/types/teacher-parent.types";
import {
  teacherParentPageSizeOptions,
  teacherParentRelationshipLabel,
  teacherParentRelationshipOptions,
  teacherParentResetQuery,
  teacherParentStatusOptions,
  teacherParentInitials,
} from "@/features/teacher/utils/teacher-parent";
import { cn } from "@/lib/utils";

function viewPath(parentId: string) {
  return `/guru/ibu-bapa/${parentId}`;
}

function createPath() {
  return "/guru/ibu-bapa/tambah";
}

function ViewButton({ parentId, fullName, fullWidth = false }: { parentId: string; fullName: string; fullWidth?: boolean }) {
  return (
    <Button
      asChild
      size="sm"
      className={cn(
        "h-10 min-w-[96px] gap-2 rounded-lg bg-primary px-4 font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 active:bg-primary/80 focus-visible:ring-primary/30",
        fullWidth && "w-full",
      )}
    >
      <Link to={viewPath(parentId)} aria-label={`Lihat ibu bapa ${fullName}`}>
        <Eye className="size-4" aria-hidden="true" />
        Lihat
      </Link>
    </Button>
  );
}

export function AddParentButton({ fullWidth = false }: { fullWidth?: boolean }) {
  return (
    <Button asChild variant="secondary">
      <Link
        to={createPath()}
        className={cn("h-12 rounded-xl px-6 font-semibold shadow-sm hover:bg-secondary/90 focus-visible:ring-secondary/30", fullWidth && "w-full")}
      >
        <Plus className="size-4" aria-hidden="true" />
        Tambah Ibu Bapa
      </Link>
    </Button>
  );
}

function ParentIdentity({ item }: { item: TeacherParentListItem }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <Avatar className="size-11">
        {item.avatar ? <AvatarImage src={item.avatar} alt="" /> : null}
        <AvatarFallback className="bg-secondary/10 font-semibold text-secondary">{teacherParentInitials(item.fullName)}</AvatarFallback>
      </Avatar>
      <div className="min-w-0">
        <p className="break-words font-semibold text-foreground">{item.fullName}</p>
        <p className="mt-1 truncate text-sm text-muted-foreground">{teacherParentRelationshipLabel(item.relationship)}</p>
      </div>
    </div>
  );
}

export function TeacherParentListFilters({ query, onChange }: { query: Partial<TeacherParentListQuery>; onChange: (patch: Partial<TeacherParentListQuery>) => void }) {
  const { searchInput, handleSearchInputChange, resetSearchInput } = useDebouncedSearchInput({
    value: query.search,
    onChange: (patch) => onChange(patch as Partial<TeacherParentListQuery>),
  });

  return (
    <div className="mt-6 flex flex-col gap-3 xl:flex-row xl:items-center">
      <label className="relative flex-1">
        <span className="sr-only">Cari ibu bapa</span>
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
        <Input
          value={searchInput}
          onChange={handleSearchInputChange}
          placeholder="Cari ibu bapa, e-mel, nama murid atau ID murid."
          className="!bg-background/40 pl-9 text-foreground placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-primary/20"
          aria-label="Cari ibu bapa, e-mel, nama murid atau ID murid."
        />
      </label>
      <label className="w-full text-sm sm:w-auto">
        <span className="sr-only">Status</span>
        <Select value={query.status ?? "all"} onValueChange={(value) => onChange({ status: value === "all" ? undefined : value as TeacherParentListQuery["status"], page: 1 })}>
          <SelectTrigger className="!bg-background/40 sm:w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {teacherParentStatusOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </label>
      <label className="w-full text-sm sm:w-auto">
        <span className="sr-only">Hubungan</span>
        <Select value={query.relationship ?? "all"} onValueChange={(value) => onChange({ relationship: value === "all" ? undefined : value as TeacherParentListQuery["relationship"], page: 1 })}>
          <SelectTrigger className="!bg-background/40 sm:w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {teacherParentRelationshipOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </label>
      <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={() => { resetSearchInput(); onChange(teacherParentResetQuery()); }}>
        <SlidersHorizontal className="size-4" aria-hidden="true" />
        Reset
      </Button>
    </div>
  );
}

export function TeacherParentListTable({ rows }: { rows: TeacherParentListItem[] }) {
  return (
    <div className="mt-5 hidden overflow-hidden rounded-2xl border border-border bg-card md:block">
      <table className="w-full border-collapse text-sm">
        <thead className="bg-muted/70 text-muted-foreground">
          <tr>
            <th scope="col" className="w-[30%] px-4 py-3 text-left font-medium">Nama</th>
            <th scope="col" className="w-[22%] px-4 py-3 text-left font-medium">E-mel</th>
            <th scope="col" className="w-[12%] px-4 py-3 text-left font-medium">Bilangan Anak</th>
            <th scope="col" className="w-[14%] px-4 py-3 text-left font-medium">Hubungan</th>
            <th scope="col" className="w-[12%] px-4 py-3 text-left font-medium">Status</th>
            <th scope="col" className="w-32 px-4 py-3 text-right font-medium">Tindakan</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((item) => (
            <tr key={item.id} className="border-t border-border hover:bg-muted/35">
              <td className="px-4 py-3"><ParentIdentity item={item} /></td>
              <td className="px-4 py-3 text-muted-foreground">{item.email ?? "Tidak tersedia"}</td>
              <td className="px-4 py-3 text-foreground">{item.studentCount}</td>
              <td className="px-4 py-3 text-muted-foreground">{teacherParentRelationshipLabel(item.relationship)}</td>
              <td className="px-4 py-3"><AdminAccountStatusBadge status={item.accountStatus} /></td>
              <td className="px-4 py-3 text-right">
                <div className="flex justify-end gap-2">
                  <ViewButton parentId={item.id} fullName={item.fullName} />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function TeacherParentMobileCards({ rows }: { rows: TeacherParentListItem[] }) {
  return (
    <div className="mt-5 grid gap-3 md:hidden">
      {rows.map((item) => (
        <article key={item.id} className="rounded-lg border border-border bg-card p-4">
          <ParentIdentity item={item} />
          <dl className="mt-4 grid gap-3 text-sm">
            <div className="flex items-center justify-between gap-3">
              <dt className="text-muted-foreground">E-mel</dt>
              <dd className="text-right font-medium text-foreground">{item.email ?? "Tidak tersedia"}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-muted-foreground">Bilangan Anak</dt>
              <dd className="text-right font-medium text-foreground">{item.studentCount}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-muted-foreground">Hubungan</dt>
              <dd className="text-right font-medium text-foreground">{teacherParentRelationshipLabel(item.relationship)}</dd>
            </div>
          </dl>
          <div className="mt-4 flex flex-col gap-3">
            <AdminAccountStatusBadge status={item.accountStatus} />
            <ViewButton parentId={item.id} fullName={item.fullName} fullWidth />
          </div>
        </article>
      ))}
    </div>
  );
}

export function TeacherParentPagination({
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
      <p className="text-sm text-muted-foreground">Menunjukkan {start}-{end} daripada {total} ibu bapa</p>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
        <label className="flex flex-col gap-2 text-sm text-muted-foreground sm:flex-row sm:items-center">
          <span>Baris setiap halaman</span>
          <Select value={String(limit)} onValueChange={(value) => onPageSizeChange(Number(value))}>
            <SelectTrigger className="!bg-background/40 sm:w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {teacherParentPageSizeOptions.map((size) => (
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

export function TeacherParentListLoading() {
  return (
    <div className="mt-6 space-y-5" aria-busy="true" aria-label="Memuatkan senarai ibu bapa">
      <div className="hidden overflow-hidden rounded-2xl border border-border bg-card md:block">
        <div className="grid grid-cols-[1.2fr_0.9fr_0.7fr_0.8fr_0.7fr_auto] gap-4 bg-muted/70 p-4">
          {Array.from({ length: 6 }).map((_, index) => <Skeleton key={index} className="h-4" />)}
        </div>
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="grid grid-cols-[1.2fr_0.9fr_0.7fr_0.8fr_0.7fr_auto] items-center gap-4 border-t border-border p-4">
            {Array.from({ length: 6 }).map((__, cellIndex) => <Skeleton key={cellIndex} className="h-5" />)}
          </div>
        ))}
      </div>
      <div className="grid gap-3 md:hidden">
        {Array.from({ length: 3 }).map((_, index) => <Skeleton key={index} className="h-40 rounded-lg" />)}
      </div>
    </div>
  );
}

export function TeacherParentEmptyState({ canCreate }: { canCreate: boolean }) {
  return (
    <EmptyState
      title="Tiada ibu bapa"
      description="Belum ada akaun ibu bapa yang direkodkan untuk sekolah ini."
      action={canCreate ? <AddParentButton /> : undefined}
      icon={<Users className="size-6" />}
    />
  );
}

export function TeacherParentFilteredEmptyState({ onReset }: { onReset: () => void }) {
  return (
    <EmptyState
      title="Tiada padanan ditemui"
      description="Cuba ubah carian atau penapis untuk melihat ibu bapa yang lain."
      action={<Button variant="outline" onClick={onReset}>Reset</Button>}
      icon={<Search className="size-6" />}
    />
  );
}

export function TeacherParentNoSchoolState() {
  return (
    <EmptyState
      title="Sekolah belum dipautkan"
      description="Guru ini belum mempunyai sekolah yang dipautkan untuk mengurus ibu bapa."
      icon={<Users className="size-6" />}
    />
  );
}

export function TeacherParentErrorState({ onRetry }: { onRetry: () => void }) {
  return <ErrorState title="Tidak dapat memuatkan ibu bapa" description="Sila cuba lagi." actionLabel="Cuba lagi" onAction={onRetry} />;
}
