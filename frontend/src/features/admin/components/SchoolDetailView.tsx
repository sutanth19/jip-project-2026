import * as React from "react";
import {
  Archive,
  ArrowLeft,
  BarChart3,
  BookOpen,
  Building2,
  CalendarDays,
  CircleCheck,
  CirclePause,
  GraduationCap,
  Loader2,
  Mail,
  MapPin,
  Phone,
  RotateCcw,
  ShieldCheck,
  TriangleAlert,
  UserRound,
  UsersRound,
} from "lucide-react";
import { Link } from "react-router-dom";

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { normalizeMediaPreviewUrl } from "@/features/admin/api/media.api";
import { SchoolStatusBadge } from "@/features/admin/components/SchoolList";
import { warningActionColorClass } from "@/features/admin/utils/action-styles";
import type { SchoolAccountStatus, SchoolDetail } from "@/features/admin/utils/school-detail";
import { getSchoolInitials } from "@/features/admin/utils/school-list";
import { cn } from "@/lib/utils";
import type { AuthRole } from "@/types/auth";
import { formatDateTime } from "@/utils/date";

type SchoolStatusTarget = "ACTIVE" | "SUSPENDED" | "ARCHIVED";

type SchoolStatusAction = {
  targetStatus: SchoolStatusTarget;
  label: string;
  helper: string;
  dialogTitle: string;
  dialogDescription: (schoolName: string) => string;
  confirmLabel: string;
  tone: "default" | "warning";
};

type SchoolDetailViewProps = {
  detail: SchoolDetail;
  currentRole: AuthRole | null;
  statusPending: boolean;
  statusError?: string | null;
  archiveError?: string | null;
  onStatusChange: (status: SchoolStatusTarget) => Promise<boolean>;
  onArchive: () => Promise<boolean>;
};

function formatSchoolDateTime(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Tidak tersedia" : formatDateTime(date);
}

function optionalLabel(value: string | null): string {
  return value ?? "Belum ditetapkan";
}

function availableLabel(value: string | null): string {
  return value ?? "Tidak tersedia";
}

function normalizedLogoUrl(value: string | null): string | null {
  if (!value) {
    return null;
  }

  try {
    return normalizeMediaPreviewUrl(value);
  } catch {
    return null;
  }
}

function DetailCard({
  icon,
  iconClassName,
  title,
  children,
  className,
}: {
  icon: React.ReactNode;
  iconClassName: string;
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("h-full rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6", className)}>
      <div className="flex items-center gap-3">
        <div className={cn("flex size-12 shrink-0 items-center justify-center rounded-xl", iconClassName)}>
          {icon}
        </div>
        <h2 className="text-xl font-semibold leading-none text-foreground">{title}</h2>
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function InformationRow({
  icon,
  label,
  value,
  className,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex min-w-0 gap-4", className)}>
      <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="mt-1 break-words text-base font-medium leading-6 text-foreground">{value}</p>
      </div>
    </div>
  );
}

function SchoolLogoMark({ detail }: { detail: SchoolDetail }) {
  const [logoOk, setLogoOk] = React.useState(Boolean(detail.logo));
  const logoUrl = normalizedLogoUrl(detail.logo);

  if (logoUrl && logoOk) {
    return (
      <div className="flex size-20 shrink-0 items-center justify-center rounded-2xl border border-border bg-background/60 p-3 shadow-sm sm:size-22">
        <img
          src={logoUrl}
          alt={`Logo ${detail.schoolName}`}
          className="max-h-full max-w-full object-contain"
          onError={() => setLogoOk(false)}
        />
      </div>
    );
  }

  return (
    <div className="flex size-20 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-xl font-bold text-blue-700 ring-1 ring-blue-200 dark:bg-blue-400/10 dark:text-blue-200 dark:ring-blue-400/20 sm:size-22">
      <span aria-hidden={false}>{getSchoolInitials(detail.schoolName)}</span>
    </div>
  );
}

function SchoolSummaryCard({ detail }: { detail: SchoolDetail }) {
  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-center">
          <SchoolLogoMark detail={detail} />
          <div className="min-w-0">
            <h2 className="break-words text-xl font-semibold text-foreground sm:text-2xl">{detail.schoolName}</h2>
            <p className="mt-2 flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Building2 className="size-4" aria-hidden="true" />
              {detail.schoolCode}
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-3 lg:items-end lg:text-right">
          <SchoolStatusBadge status={detail.accountStatus} />
          <div className="space-y-1 text-sm text-muted-foreground">
            <p>Terakhir dikemas kini</p>
            <p className="font-medium text-foreground">{formatSchoolDateTime(detail.updatedAt)}</p>
          </div>
        </div>
      </div>
    </section>
  );
}

function SchoolInformationCard({ detail }: { detail: SchoolDetail }) {
  return (
    <DetailCard
      icon={<Building2 className="size-6" aria-hidden="true" />}
      iconClassName="bg-blue-50 text-blue-600 dark:bg-blue-400/10 dark:text-blue-300"
      title="Maklumat Sekolah"
    >
      <div className="grid gap-x-8 gap-y-6 sm:grid-cols-2">
        <div>
          <InformationRow icon={<UserRound className="size-4" aria-hidden="true" />} label="Nama Pengetua" value={optionalLabel(detail.principalName)} />
        </div>
        <div>
          <InformationRow icon={<Mail className="size-4" aria-hidden="true" />} label="E-mel Perhubungan" value={optionalLabel(detail.contactEmail)} />
        </div>
        <div>
          <InformationRow icon={<Phone className="size-4" aria-hidden="true" />} label="Nombor Telefon" value={availableLabel(detail.phone)} />
        </div>
        <div>
          <InformationRow icon={<CalendarDays className="size-4" aria-hidden="true" />} label="Tarikh Dicipta" value={formatSchoolDateTime(detail.createdAt)} />
        </div>
        <div className="sm:col-span-2">
          <InformationRow icon={<MapPin className="size-4" aria-hidden="true" />} label="Alamat Sekolah" value={availableLabel(detail.address)} />
        </div>
      </div>
    </DetailCard>
  );
}

function displayCount(value: number | undefined): number {
  return value ?? 0;
}

function SchoolStatisticRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <div className="flex min-h-[72px] items-center justify-between rounded-xl border border-border bg-muted/20 px-5 py-3">
      <div className="flex items-center gap-4">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-violet-500/10 text-violet-500 dark:text-violet-300">
          {icon}
        </div>
        <span className="text-base font-medium text-muted-foreground">{label}</span>
      </div>
      <p className="text-2xl font-semibold tracking-tight text-foreground">{value}</p>
    </div>
  );
}

function SchoolStatisticsCard({ detail }: { detail: SchoolDetail }) {
  const stats = [
    { label: "Guru", value: displayCount(detail.counts.teachers), icon: <GraduationCap className="size-5" aria-hidden="true" /> },
    { label: "Murid", value: displayCount(detail.counts.students), icon: <UsersRound className="size-5" aria-hidden="true" /> },
    { label: "Kelas", value: displayCount(detail.counts.classes), icon: <BookOpen className="size-5" aria-hidden="true" /> },
  ];

  return (
    <DetailCard
      icon={<BarChart3 className="size-6" aria-hidden="true" />}
      iconClassName="bg-violet-100 text-violet-700 dark:bg-violet-400/10 dark:text-violet-300"
      title="Statistik Sekolah"
    >
      <div className="space-y-3">
        {stats.map((stat) => (
          <SchoolStatisticRow key={stat.label} icon={stat.icon} label={stat.label} value={stat.value} />
        ))}
      </div>
    </DetailCard>
  );
}

function getSchoolStatusAction(status: SchoolAccountStatus, role: AuthRole | null): SchoolStatusAction | null {
  if (status === "ACTIVE") {
    return {
      targetStatus: "SUSPENDED",
      label: "Gantung Sekolah",
      helper: "Menggantung sekolah akan menghentikan akses sementara tanpa memadam data.",
      dialogTitle: "Gantung sekolah?",
      dialogDescription: (schoolName) => `Sekolah ${schoolName} tidak dapat menggunakan sistem buat sementara waktu, tetapi semua data akan dikekalkan.`,
      confirmLabel: "Gantung Sekolah",
      tone: "warning",
    };
  }

  if (status === "SUSPENDED") {
    return {
      targetStatus: "ACTIVE",
      label: "Aktifkan Sekolah",
      helper: "Sekolah ini sedang digantung. Aktifkan semula untuk memulihkan akses pengguna.",
      dialogTitle: "Aktifkan sekolah?",
      dialogDescription: (schoolName) => `Sekolah ${schoolName} akan dibenarkan menggunakan sistem semula.`,
      confirmLabel: "Aktifkan Sekolah",
      tone: "default",
    };
  }

  if (status === "ARCHIVED" && role === "SUPER_ADMIN") {
    return {
      targetStatus: "ACTIVE",
      label: "Pulihkan Sekolah",
      helper: "Sekolah ini telah diarkibkan.",
      dialogTitle: "Pulihkan sekolah?",
      dialogDescription: (schoolName) => `Sekolah ${schoolName} akan dipulihkan dan diaktifkan semula.`,
      confirmLabel: "Pulihkan Sekolah",
      tone: "default",
    };
  }

  return null;
}

function SchoolStatusDialog({
  detail,
  action,
  open,
  pending,
  error,
  onOpenChange,
  onConfirm,
}: {
  detail: SchoolDetail;
  action: SchoolStatusAction;
  open: boolean;
  pending: boolean;
  error?: string | null;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => Promise<boolean>;
}) {
  const handleConfirm = async () => {
    const ok = await onConfirm();

    if (ok) {
      onOpenChange(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{action.dialogTitle}</AlertDialogTitle>
          <AlertDialogDescription>{action.dialogDescription(detail.schoolName)}</AlertDialogDescription>
        </AlertDialogHeader>
        {error ? <p className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</p> : null}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Batal</AlertDialogCancel>
          <Button
            type="button"
            disabled={pending}
            onClick={handleConfirm}
            className={cn(action.tone === "warning" && "border border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-300")}
          >
            {pending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
            {pending ? "Memproses..." : action.confirmLabel}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function SchoolControlCard({
  detail,
  currentRole,
  pending,
  error,
  onStatusChange,
}: {
  detail: SchoolDetail;
  currentRole: AuthRole | null;
  pending: boolean;
  error?: string | null;
  onStatusChange: (status: SchoolStatusTarget) => Promise<boolean>;
}) {
  const [open, setOpen] = React.useState(false);
  const action = getSchoolStatusAction(detail.accountStatus, currentRole);
  const ActionIcon = action?.targetStatus === "SUSPENDED" ? CirclePause : action?.label === "Pulihkan Sekolah" ? RotateCcw : CircleCheck;

  return (
    <section className="rounded-2xl border border-emerald-500/25 bg-emerald-500/5 p-5 shadow-sm sm:p-6">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-4">
          <div className="flex size-14 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-300">
            <ShieldCheck className="size-7" aria-hidden="true" />
          </div>
          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-xl font-semibold leading-none text-foreground">Kawalan Sekolah</h2>
              <SchoolStatusBadge status={detail.accountStatus} />
            </div>
            <p className="text-sm leading-6 text-muted-foreground">
              {action?.helper ?? "Sekolah ini telah diarkibkan."}
            </p>
          </div>
        </div>
        {action ? (
          <>
            <Button
              type="button"
              disabled={pending}
              onClick={() => setOpen(true)}
              className={cn(
                action.tone === "warning"
                  ? cn(warningActionColorClass, "h-12 w-full min-w-[220px] gap-2 rounded-xl px-6 font-semibold sm:w-auto")
                  : "h-12 w-full min-w-[220px] gap-2 rounded-xl bg-primary px-6 font-semibold text-primary-foreground hover:bg-primary/90 sm:w-auto",
              )}
            >
              <ActionIcon className="size-4" aria-hidden="true" />
              {action.label}
            </Button>
            <SchoolStatusDialog
              detail={detail}
              action={action}
              open={open}
              pending={pending}
              error={error}
              onOpenChange={setOpen}
              onConfirm={() => onStatusChange(action.targetStatus)}
            />
          </>
        ) : (
          <p className="w-full rounded-xl border border-border bg-muted/40 p-3 text-sm leading-6 text-muted-foreground sm:max-w-[320px]">
            Hanya Super Admin boleh memulihkan sekolah yang telah diarkibkan.
          </p>
        )}
      </div>
    </section>
  );
}

function SchoolArchiveDialog({
  detail,
  open,
  pending,
  error,
  onOpenChange,
  onConfirm,
}: {
  detail: SchoolDetail;
  open: boolean;
  pending: boolean;
  error?: string | null;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => Promise<boolean>;
}) {
  const handleConfirm = async () => {
    const ok = await onConfirm();

    if (ok) {
      onOpenChange(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Arkibkan sekolah?</AlertDialogTitle>
          <AlertDialogDescription>
            Sekolah {detail.schoolName} akan diarkibkan dan akses pengguna berkaitan akan dihentikan. Data sekolah, guru, kelas dan murid tidak akan dipadam.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {error ? <p className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</p> : null}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Batal</AlertDialogCancel>
          <Button type="button" variant="destructive" disabled={pending} onClick={handleConfirm}>
            {pending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
            {pending ? "Memproses..." : "Arkibkan Sekolah"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function SchoolDangerZone({
  detail,
  pending,
  error,
  onArchive,
}: {
  detail: SchoolDetail;
  pending: boolean;
  error?: string | null;
  onArchive: () => Promise<boolean>;
}) {
  const [open, setOpen] = React.useState(false);

  return (
    <section className="rounded-2xl border border-destructive/35 bg-destructive/5 p-5 shadow-sm sm:p-6">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex size-14 shrink-0 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
            <TriangleAlert className="size-7" aria-hidden="true" />
          </div>
          <div className="space-y-1">
            <h2 className="text-xl font-semibold leading-none text-foreground">Zon Bahaya</h2>
            <p className="text-sm leading-6 text-muted-foreground">
              {detail.accountStatus === "ARCHIVED"
                ? "Sekolah ini telah diarkibkan."
                : "Arkibkan sekolah apabila ia tidak lagi menggunakan platform DIGITAL MAIN-LiT."}
            </p>
          </div>
        </div>
        {detail.accountStatus !== "ARCHIVED" ? (
          <Button
            type="button"
            variant="outline"
            className="h-12 w-full min-w-[220px] gap-2 rounded-xl border-destructive/40 px-6 font-semibold text-destructive hover:bg-destructive/10 focus-visible:ring-destructive/30 sm:w-auto"
            disabled={pending}
            onClick={() => setOpen(true)}
          >
            <Archive className="size-4" aria-hidden="true" />
            Arkibkan Sekolah
          </Button>
        ) : null}
      </div>
      {detail.accountStatus !== "ARCHIVED" ? (
        <SchoolArchiveDialog
          detail={detail}
          open={open}
          pending={pending}
          error={error}
          onOpenChange={setOpen}
          onConfirm={onArchive}
        />
      ) : null}
    </section>
  );
}

export function SchoolDetailSkeleton() {
  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <Skeleton className="size-20 rounded-2xl" />
            <div className="space-y-3">
              <Skeleton className="h-7 w-64" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
          <div className="space-y-2">
            <Skeleton className="h-8 w-28" />
            <Skeleton className="h-4 w-44" />
          </div>
        </div>
      </section>
      <div className="grid items-stretch gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(340px,0.85fr)]">
        <Skeleton className="h-80 rounded-2xl" />
        <Skeleton className="h-80 rounded-2xl" />
      </div>
      <Skeleton className="h-36 rounded-2xl" />
      <Skeleton className="h-36 rounded-2xl" />
    </div>
  );
}

export function SchoolDetailErrorState({
  title,
  description,
  onRetry,
  path,
}: {
  title: string;
  description?: string;
  onRetry?: () => void;
  path: string;
}) {
  return (
    <section className="rounded-2xl border border-border bg-card p-6 text-center text-card-foreground shadow-sm">
      <TriangleAlert className="mx-auto size-8 text-destructive" aria-hidden="true" />
      <h2 className="mt-3 text-base font-semibold">{title}</h2>
      {description ? <p className="mt-1 text-sm leading-6 text-muted-foreground">{description}</p> : null}
      <div className="mt-5 flex flex-col justify-center gap-3 sm:flex-row">
        {onRetry ? (
          <Button type="button" className="h-11 rounded-xl px-5" onClick={onRetry}>
            Cuba Semula
          </Button>
        ) : null}
        <Button asChild variant="outline" className="h-11 rounded-xl px-5">
          <Link to={path}>
            <ArrowLeft className="size-4" aria-hidden="true" />
            Kembali ke Senarai Sekolah
          </Link>
        </Button>
      </div>
    </section>
  );
}

export function SchoolDetailView({
  detail,
  currentRole,
  statusPending,
  statusError,
  archiveError,
  onStatusChange,
  onArchive,
}: SchoolDetailViewProps) {
  return (
    <div className="space-y-6">
      <SchoolSummaryCard detail={detail} />
      <div className="grid items-stretch gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(340px,0.85fr)]">
        <div className="h-full">
          <SchoolInformationCard detail={detail} />
        </div>
        <div className="h-full">
          <SchoolStatisticsCard detail={detail} />
        </div>
      </div>
      <SchoolControlCard
        detail={detail}
        currentRole={currentRole}
        pending={statusPending}
        error={statusError}
        onStatusChange={onStatusChange}
      />
      <SchoolDangerZone
        detail={detail}
        pending={statusPending}
        error={archiveError}
        onArchive={onArchive}
      />
    </div>
  );
}
