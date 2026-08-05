import { Eye } from "lucide-react";
import { Link } from "react-router-dom";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { PageMeta } from "@/features/admin/types/admin.types";
import type { AdminAccountListItem } from "@/features/admin/utils/admin-account-list";
import { adminPageSizeOptions } from "@/features/admin/utils/admin-status";
import { formatDate } from "@/utils/date";
import { AdminAccountStatusBadge } from "./AdminAccountStatusBadge";
import { AdminSetupStatusBadge } from "./AdminSetupStatusBadge";

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "A";
}

function phoneLabel(phone: string | null) {
  return phone ?? "Tidak dinyatakan";
}

function setupStatus(isFirstLogin: boolean) {
  return isFirstLogin ? "WAITING" : "DONE";
}

function lastLoginLabel(lastLogin: string | null) {
  return lastLogin ? formatDate(lastLogin) : "Belum pernah";
}

export function AdminAccountTable({ rows, path }: { rows: AdminAccountListItem[]; path: string }) {
  return (
    <div className="mt-5 hidden overflow-hidden rounded-2xl border border-border bg-card md:block">
      <table className="w-full border-collapse text-sm">
        <thead className="bg-muted/70 text-muted-foreground">
          <tr>
            <th scope="col" className="px-4 py-3 text-left font-medium">Pentadbir</th>
            <th scope="col" className="px-4 py-3 text-left font-medium">E-mel</th>
            <th scope="col" className="px-4 py-3 text-left font-medium">Telefon</th>
            <th scope="col" className="px-4 py-3 text-left font-medium">Status</th>
            <th scope="col" className="px-4 py-3 text-left font-medium">Status Penyediaan</th>
            <th scope="col" className="px-4 py-3 text-left font-medium">Log Masuk Terakhir</th>
            <th scope="col" className="px-4 py-3 text-right font-medium">Tindakan</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((admin) => (
            <tr key={admin.id} className="border-t border-border hover:bg-muted/35">
              <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarImage src={admin.avatar ?? undefined} alt={admin.fullName} />
                    <AvatarFallback>{initials(admin.fullName)}</AvatarFallback>
                  </Avatar>
                  <span className="font-medium text-foreground">{admin.fullName}</span>
                </div>
              </td>
              <td className="px-4 py-3 text-muted-foreground">{admin.email}</td>
              <td className="px-4 py-3 text-muted-foreground">{phoneLabel(admin.phone)}</td>
              <td className="px-4 py-3"><AdminAccountStatusBadge status={admin.accountStatus} /></td>
              <td className="px-4 py-3"><AdminSetupStatusBadge status={setupStatus(admin.isFirstLogin)} /></td>
              <td className="px-4 py-3 text-muted-foreground">{lastLoginLabel(admin.lastLogin)}</td>
              <td className="px-4 py-3 text-right">
                <Button
                  asChild
                  size="sm"
                  className="h-10 min-w-[96px] gap-2 rounded-lg bg-primary px-4 font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 active:bg-primary/80 focus-visible:ring-primary/30 dark:bg-primary dark:text-primary-foreground dark:hover:bg-primary/90"
                >
                  <Link
                    to={`${path}/${admin.id}`}
                    aria-label={`Lihat ${admin.fullName}`}
                  >
                    <Eye className="size-4" aria-hidden="true" />
                    Lihat
                  </Link>
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function AdminAccountMobileList({ rows, path }: { rows: AdminAccountListItem[]; path: string }) {
  return (
    <div className="grid gap-3 md:hidden">
      {rows.map((admin) => (
        <article key={admin.id} className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-start gap-3">
            <Avatar className="size-12">
              <AvatarImage src={admin.avatar ?? undefined} alt={admin.fullName} />
              <AvatarFallback>{initials(admin.fullName)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <h3 className="truncate text-base font-semibold text-foreground">{admin.fullName}</h3>
              <p className="truncate text-sm text-muted-foreground">{admin.email}</p>
              <p className="mt-1 text-sm text-muted-foreground">{phoneLabel(admin.phone)}</p>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <AdminAccountStatusBadge status={admin.accountStatus} />
            <AdminSetupStatusBadge status={setupStatus(admin.isFirstLogin)} />
          </div>
          <div className="mt-3 flex items-center justify-between gap-3">
            <span className="text-sm text-muted-foreground">{lastLoginLabel(admin.lastLogin)}</span>
            <Button
              asChild
              size="sm"
              className="h-10 min-w-[96px] gap-2 rounded-lg bg-primary px-4 font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 active:bg-primary/80 focus-visible:ring-primary/30 dark:bg-primary dark:text-primary-foreground dark:hover:bg-primary/90"
            >
              <Link
                to={`${path}/${admin.id}`}
                aria-label={`Lihat ${admin.fullName}`}
              >
                <Eye className="size-4" aria-hidden="true" />
                Lihat
              </Link>
            </Button>
          </div>
        </article>
      ))}
    </div>
  );
}

export function AdminAccountPagination({
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
        Menunjukkan {start}-{end} daripada {meta.total} pentadbir
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
