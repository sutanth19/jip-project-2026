import * as React from "react";
import {
  Archive,
  Building2,
  CalendarDays,
  ChevronRight,
  CircleCheck,
  Clock3,
  GraduationCap,
  Loader2,
  Mail,
  Phone,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  TriangleAlert,
  UserRound,
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { normalizeMediaPreviewUrl } from "@/features/admin/api/media.api";
import { AdminAccountStatusBadge } from "@/features/admin/components/AdminAccountStatusBadge";
import { AdminSetupStatusBadge } from "@/features/admin/components/AdminSetupStatusBadge";
import { adminAccountStatusLabels } from "@/features/admin/utils/admin-account-detail";
import { warningActionColorClass } from "@/features/admin/utils/action-styles";
import {
  canArchiveTeacher,
  canResendTeacherSetup,
  formatTeacherDateTime,
  getTeacherInitials,
  getTeacherLastLoginLabel,
  getTeacherLifecycleAction,
  type TeacherDetail,
  type TeacherLifecycleAction,
  type TeacherSchoolDetail,
  type TeacherStatusTarget,
} from "@/features/admin/utils/teacher-detail";
import { cn } from "@/lib/utils";
import type { AuthRole } from "@/types/auth";

type TeacherDetailViewProps = {
  detail: TeacherDetail;
  currentRole: AuthRole | null;
  statusPending: boolean;
  resendPending: boolean;
  statusError?: string | null;
  resendError?: string | null;
  archiveError?: string | null;
  onStatusChange: (status: TeacherStatusTarget) => Promise<boolean>;
  onResendSetup: () => void;
  onArchive: () => Promise<boolean>;
};

function fallback(value: string | null): string {
  return value ?? "—";
}

function availableLabel(value: string | null): string {
  return value ?? "Tidak tersedia";
}

function normalizeLogo(value: string | null): string | null {
  if (!value) return null;

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
    <Card className={cn("h-full rounded-2xl border border-border bg-card p-5 shadow-sm ring-0 sm:p-6", className)}>
      <CardContent className="flex h-full flex-col p-0">
        <div className="flex items-center gap-3">
          <div className={cn("flex size-12 shrink-0 items-center justify-center rounded-xl", iconClassName)}>
            {icon}
          </div>
          <h2 className="text-lg font-semibold leading-none text-foreground">{title}</h2>
        </div>
        <div className="mt-5 flex flex-1 flex-col">{children}</div>
      </CardContent>
    </Card>
  );
}

function InformationItem({
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
    <div className={cn("flex min-w-0 gap-3", className)}>
      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        {icon}
      </div>
      <div className="min-w-0 space-y-1">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="break-words text-sm font-medium leading-6 text-foreground sm:text-base">{value}</p>
      </div>
    </div>
  );
}

function TeacherProfileSummary({ detail }: { detail: TeacherDetail }) {
  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-center gap-4">
          <Avatar className="size-[72px] text-xl lg:size-20">
            <AvatarImage src={normalizeLogo(detail.avatar) ?? undefined} alt={detail.fullName} />
            <AvatarFallback className="bg-secondary/10 font-semibold text-secondary">
              {getTeacherInitials(detail.fullName)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <h2 className="truncate text-xl font-semibold text-foreground sm:text-2xl">{detail.fullName}</h2>
            <p className="mt-1 flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <GraduationCap className="size-4" aria-hidden="true" />
              Guru
            </p>
            {detail.teacherId ? <p className="mt-1 text-sm font-medium text-muted-foreground">{detail.teacherId}</p> : null}
          </div>
        </div>

        <div className="flex flex-wrap gap-3 lg:max-w-[260px] lg:justify-end">
          <AdminAccountStatusBadge status={detail.accountStatus} />
          <div className="w-full space-y-1 text-sm text-muted-foreground lg:text-right">
            <p>Log masuk terakhir</p>
            <p className="font-medium text-foreground">{getTeacherLastLoginLabel(detail.lastLogin)}</p>
          </div>
        </div>
      </div>
    </section>
  );
}

function TeacherAccountInformationCard({ detail, className }: { detail: TeacherDetail; className?: string }) {
  return (
    <DetailCard
      icon={<UserRound className="size-6" aria-hidden="true" />}
      iconClassName="bg-indigo-50 text-indigo-600 dark:bg-indigo-400/10 dark:text-indigo-300"
      title="Maklumat Akaun"
      className={className}
    >
      <div className="grid gap-x-6 gap-y-5 sm:grid-cols-2">
        <InformationItem icon={<Mail className="size-4" aria-hidden="true" />} label="E-mel" value={fallback(detail.email)} />
        <InformationItem icon={<Phone className="size-4" aria-hidden="true" />} label="Nombor Telefon" value={fallback(detail.phone)} />
        <InformationItem icon={<GraduationCap className="size-4" aria-hidden="true" />} label="ID Guru" value={fallback(detail.teacherId)} />
        <InformationItem icon={<CalendarDays className="size-4" aria-hidden="true" />} label="Tarikh Dicipta" value={formatTeacherDateTime(detail.createdAt)} />
        <InformationItem icon={<Clock3 className="size-4" aria-hidden="true" />} label="Terakhir Dikemas Kini" value={formatTeacherDateTime(detail.updatedAt)} className="sm:col-span-2" />
      </div>
    </DetailCard>
  );
}

function schoolInitials(name: string | null): string {
  return getTeacherInitials(name ?? "Sekolah");
}

function TeacherSchoolLogo({ school }: { school: TeacherSchoolDetail }) {
  const [failedLogo, setFailedLogo] = React.useState<string | null>(null);
  const logoUrl = normalizeLogo(school.logo);
  const logoSrc = logoUrl && failedLogo !== logoUrl ? logoUrl : undefined;

  if (logoSrc) {
    return (
      <div className="flex size-20 shrink-0 items-center justify-center rounded-2xl border border-border bg-background/60 p-2 shadow-sm">
        <img
          src={logoSrc}
          alt={`Logo ${school.schoolName ?? "sekolah"}`}
          className="max-h-full max-w-full object-contain"
          onError={() => setFailedLogo(logoSrc)}
        />
      </div>
    );
  }

  return (
    <div className="flex size-20 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-xl font-bold text-primary ring-1 ring-primary/20">
      {school.schoolName ? schoolInitials(school.schoolName) : <Building2 className="size-7" aria-hidden="true" />}
    </div>
  );
}

function TeacherSchoolCard({ school, className }: { school: TeacherSchoolDetail | null; className?: string }) {
  return (
    <DetailCard
      icon={<Building2 className="size-6" aria-hidden="true" />}
      iconClassName="bg-blue-50 text-blue-600 dark:bg-blue-400/10 dark:text-blue-300"
      title="Maklumat Sekolah"
      className={className}
    >
      {school?.schoolName ? (
        <div className="flex h-full flex-col gap-6">
          <div className="flex flex-col items-center text-center">
            <TeacherSchoolLogo school={school} />
            <div className="mt-4 min-w-0">
              <h3 className="break-words text-xl font-semibold leading-snug text-foreground">{school.schoolName}</h3>
              <p className="mt-1 text-sm font-medium text-muted-foreground">{school.schoolCode ?? "Kod tidak tersedia"}</p>
            </div>
          </div>
          <div className="grid gap-5 border-t border-border pt-6 md:grid-cols-2">
            <InformationItem icon={<UserRound className="size-4" aria-hidden="true" />} label="Nama Pengetua" value={availableLabel(school.principalName)} />
            <InformationItem icon={<Mail className="size-4" aria-hidden="true" />} label="E-mel Perhubungan" value={availableLabel(school.contactEmail)} />
            <InformationItem icon={<Phone className="size-4" aria-hidden="true" />} label="Nombor Telefon" value={availableLabel(school.phone)} />
          </div>
          {school.id ? (
            <div className="mt-auto pt-6">
              <Button asChild variant="outline" className="h-11 w-full justify-between rounded-xl px-5 focus-visible:ring-primary/30">
                <Link to={`/admin/sekolah/${school.id}`} aria-label={`Lihat sekolah ${school.schoolName}`}>
                  <span>Lihat Sekolah</span>
                  <ChevronRight className="size-4" aria-hidden="true" />
                </Link>
              </Button>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-muted/30 p-4">
          <h3 className="text-sm font-semibold text-foreground">Tiada sekolah ditetapkan</h3>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            Guru ini belum dipautkan kepada mana-mana sekolah.
          </p>
        </div>
      )}
    </DetailCard>
  );
}

function TeacherStatusDialog({
  action,
  detail,
  open,
  pending,
  error,
  onOpenChange,
  onConfirm,
}: {
  action: TeacherLifecycleAction;
  detail: TeacherDetail;
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
          <AlertDialogDescription>
            {detail.fullName}: status semasa ialah {adminAccountStatusLabels[detail.accountStatus]}, status sasaran ialah {adminAccountStatusLabels[action.targetStatus]}. {action.consequence}
          </AlertDialogDescription>
        </AlertDialogHeader>
        {error ? <p className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</p> : null}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Batal</AlertDialogCancel>
          <Button type="button" disabled={pending} onClick={handleConfirm} variant={action.tone === "warning" ? "outline" : "default"}>
            {pending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
            {pending ? "Memproses..." : action.label}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function TeacherAccountControlCard({
  detail,
  currentRole,
  pending,
  error,
  onStatusChange,
  className,
}: {
  detail: TeacherDetail;
  currentRole: AuthRole | null;
  pending: boolean;
  error?: string | null;
  onStatusChange: (status: TeacherStatusTarget) => Promise<boolean>;
  className?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const action = getTeacherLifecycleAction(detail.accountStatus, currentRole);
  const ActionIcon = action?.targetStatus === "SUSPENDED" ? TriangleAlert : action?.label === "Pulihkan Akaun" ? RotateCcw : CircleCheck;

  return (
    <DetailCard
      icon={<ShieldCheck className="size-6" aria-hidden="true" />}
      iconClassName="bg-emerald-100 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300"
      title="Kawalan Akaun"
      className={className}
    >
      <div className="flex h-full flex-col gap-5">
        <AdminAccountStatusBadge status={detail.accountStatus} />
        {action ? (
          <>
            <p className="text-sm leading-6 text-muted-foreground">{action.consequence}</p>
            <div className="mt-auto">
              <Button
                type="button"
                variant={action.tone === "warning" ? "outline" : "default"}
                className={cn(
                  action.tone === "warning"
                    ? cn(warningActionColorClass, "h-12 w-full gap-2 rounded-xl px-6 font-semibold")
                    : "h-12 w-full gap-2 rounded-xl bg-primary px-6 font-semibold text-primary-foreground hover:bg-primary/90",
                )}
                disabled={pending}
                onClick={() => setOpen(true)}
              >
                <ActionIcon className="size-4" aria-hidden="true" />
                {action.label}
              </Button>
            </div>
            <TeacherStatusDialog
              action={action}
              detail={detail}
              open={open}
              pending={pending}
              error={error}
              onOpenChange={setOpen}
              onConfirm={() => onStatusChange(action.targetStatus)}
            />
          </>
        ) : (
          <p className="rounded-xl border border-border bg-muted/40 p-3 text-sm leading-6 text-muted-foreground">
            Tiada tindakan kawalan akaun tersedia untuk status ini.
          </p>
        )}
      </div>
    </DetailCard>
  );
}

function TeacherSetupCard({
  detail,
  pending,
  error,
  onResendSetup,
  className,
}: {
  detail: TeacherDetail;
  pending: boolean;
  error?: string | null;
  onResendSetup: () => void;
  className?: string;
}) {
  const canResend = canResendTeacherSetup(detail);
  const message = detail.setupStatus === "COMPLETED"
    ? "Guru telah melengkapkan penyediaan akaun dan sedia menggunakan sistem."
    : detail.setupStatus === "EXPIRED"
      ? "Pautan penyediaan terdahulu telah tamat tempoh."
      : detail.setupStatus === "ARCHIVED"
        ? "Penyediaan akaun tidak tersedia untuk akaun yang telah diarkibkan."
        : "Guru masih belum melengkapkan penyediaan akaun.";
  const completedDateLabel = detail.setupCompletedAt ? formatTeacherDateTime(detail.setupCompletedAt) : null;

  return (
    <DetailCard
      icon={<Mail className="size-6" aria-hidden="true" />}
      iconClassName="bg-violet-100 text-violet-700 dark:bg-violet-400/10 dark:text-violet-300"
      title="Penyediaan Akaun"
      className={className}
    >
      <div className="flex h-full flex-col gap-5">
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-3">
            <AdminSetupStatusBadge status={detail.setupStatus} />
          </div>
          <p className="text-sm leading-6 text-muted-foreground">{message}</p>
        </div>

        <div className="mt-auto border-t border-border pt-5">
          {detail.setupStatus === "COMPLETED" ? (
            completedDateLabel ? (
              <div className="flex min-w-0 gap-3">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <CalendarDays className="size-4" aria-hidden="true" />
                </div>
                <div className="min-w-0 space-y-1">
                  <p className="text-sm text-muted-foreground">Tarikh Selesai</p>
                  <p className="break-words text-sm font-medium leading-6 text-foreground sm:text-base">{completedDateLabel}</p>
                </div>
              </div>
            ) : (
              <p className="rounded-xl border border-border bg-muted/30 p-3 text-sm leading-6 text-muted-foreground">
                Tarikh selesai tidak tersedia dalam rekod semasa.
              </p>
            )
          ) : null}
          {canResend || error ? (
            <div className="space-y-3">
              {canResend ? (
                <Button
                  type="button"
                  variant="outline"
                  className="h-12 w-full gap-2 rounded-xl border-violet-300 bg-violet-50 px-5 font-semibold text-violet-700 hover:bg-violet-100 dark:border-violet-400/30 dark:bg-violet-400/10 dark:text-violet-300 dark:hover:bg-violet-400/15"
                  disabled={pending}
                  onClick={onResendSetup}
                >
                  <RefreshCw className={cn("size-4", pending && "animate-spin")} aria-hidden="true" />
                  {pending ? "Menghantar..." : "Hantar Semula Setup"}
                </Button>
              ) : null}
              {error ? <p className="text-sm text-destructive">{error}</p> : null}
            </div>
          ) : null}
          {detail.setupStatus !== "COMPLETED" && !canResend && !error ? (
            <p className="rounded-xl border border-border bg-muted/30 p-3 text-sm leading-6 text-muted-foreground">
              Tiada tindakan penyediaan akaun tersedia untuk status ini.
            </p>
          ) : null}
        </div>
      </div>
    </DetailCard>
  );
}

function TeacherArchiveDialog({
  detail,
  open,
  pending,
  error,
  onOpenChange,
  onConfirm,
}: {
  detail: TeacherDetail;
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
          <AlertDialogTitle>Arkibkan guru?</AlertDialogTitle>
          <AlertDialogDescription>
            Guru "{detail.fullName}" tidak lagi dapat mengakses sistem selepas akaun diarkibkan. Data pengajaran berkaitan tidak akan dipadam.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {error ? <p className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</p> : null}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Batal</AlertDialogCancel>
          <Button type="button" variant="destructive" disabled={pending} onClick={handleConfirm}>
            {pending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
            {pending ? "Memproses..." : "Arkibkan Guru"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function TeacherDangerZone({
  detail,
  pending,
  error,
  onArchive,
}: {
  detail: TeacherDetail;
  pending: boolean;
  error?: string | null;
  onArchive: () => Promise<boolean>;
}) {
  const [open, setOpen] = React.useState(false);
  const canArchive = canArchiveTeacher(detail);

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
              {canArchive
                ? "Tindakan ini akan menyahaktifkan akses guru dan menyimpan rekod berkaitan untuk tujuan audit."
                : "Tindakan arkib tidak tersedia untuk status akaun semasa."}
            </p>
          </div>
        </div>
        {canArchive ? (
          <Button
            type="button"
            variant="outline"
            className="h-12 w-full min-w-[220px] gap-2 rounded-xl border-destructive/40 px-6 font-semibold text-destructive hover:bg-destructive/10 focus-visible:ring-destructive/30 sm:w-auto"
            disabled={pending}
            onClick={() => setOpen(true)}
          >
            <Archive className="size-4" aria-hidden="true" />
            Arkibkan Guru
          </Button>
        ) : null}
      </div>
      {canArchive ? (
        <TeacherArchiveDialog
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

export function TeacherDetailSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Memuatkan butiran guru">
      <section className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <Skeleton className="size-20 rounded-full" />
            <div className="space-y-3">
              <Skeleton className="h-7 w-64" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-20" />
            </div>
          </div>
          <div className="space-y-2">
            <Skeleton className="h-8 w-28" />
            <Skeleton className="h-4 w-44" />
          </div>
        </div>
      </section>
      <div className="grid items-stretch gap-6 lg:grid-cols-[2fr_1fr]">
        <Skeleton className="h-72 rounded-2xl" />
        <Skeleton className="h-56 rounded-2xl" />
      </div>
      <div className="grid items-stretch gap-6 lg:grid-cols-[2fr_1fr]">
        <Skeleton className="h-72 rounded-2xl" />
        <Skeleton className="h-56 rounded-2xl" />
      </div>
      <Skeleton className="h-36 rounded-2xl" />
    </div>
  );
}

export function TeacherDetailErrorState({
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
            Cuba Lagi
          </Button>
        ) : null}
        <Button asChild variant="outline" className="h-11 rounded-xl px-5">
          <Link to={path}>Kembali ke Senarai Guru</Link>
        </Button>
      </div>
    </section>
  );
}

export function TeacherDetailView({
  detail,
  currentRole,
  statusPending,
  resendPending,
  statusError,
  resendError,
  archiveError,
  onStatusChange,
  onResendSetup,
  onArchive,
}: TeacherDetailViewProps) {
  return (
    <div className="space-y-6">
      <TeacherProfileSummary detail={detail} />
      <div className="grid items-stretch gap-6 lg:grid-cols-[2fr_1fr]">
        <TeacherAccountInformationCard detail={detail} className="h-full" />
        <TeacherAccountControlCard
          detail={detail}
          currentRole={currentRole}
          pending={statusPending}
          error={statusError}
          onStatusChange={onStatusChange}
          className="h-full"
        />
      </div>
      <div className="grid items-stretch gap-6 lg:grid-cols-[2fr_1fr]">
        <TeacherSchoolCard school={detail.school} className="h-full" />
        <TeacherSetupCard
          detail={detail}
          pending={resendPending}
          error={resendError}
          onResendSetup={onResendSetup}
          className="h-full"
        />
      </div>
      <TeacherDangerZone
        detail={detail}
        pending={statusPending}
        error={archiveError}
        onArchive={onArchive}
      />
    </div>
  );
}
