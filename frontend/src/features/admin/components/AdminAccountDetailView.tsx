import * as React from "react";
import {
  Archive,
  CalendarDays,
  CircleCheck,
  Clock3,
  Copy,
  Loader2,
  Mail,
  Phone,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  TriangleAlert,
  UserRound,
} from "lucide-react";

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
import { AdminAccountStatusBadge } from "@/features/admin/components/AdminAccountStatusBadge";
import { AdminSetupStatusBadge } from "@/features/admin/components/AdminSetupStatusBadge";
import { warningActionColorClass } from "@/features/admin/utils/action-styles";
import {
  adminAccountStatusLabels,
  canArchiveAdmin,
  canResendAdminSetup,
  formatAdminDateTime,
  getAdminInitials,
  getAdminLastLoginLabel,
  getAdminLifecycleAction,
  type AdminAccountDetail,
  type AdminLifecycleAction,
  type AdminStatusTarget,
} from "@/features/admin/utils/admin-account-detail";
import { cn } from "@/lib/utils";

type AdminAccountDetailViewProps = {
  detail: AdminAccountDetail;
  statusPending: boolean;
  resendPending: boolean;
  statusError?: string | null;
  resendError?: string | null;
  archiveError?: string | null;
  developmentSetupUrl?: string | null;
  onStatusChange: (status: AdminStatusTarget) => Promise<boolean>;
  onResendSetup: () => void;
  onCopyDevelopmentSetupUrl?: () => void;
  onArchive: () => Promise<boolean>;
};

type DetailCardProps = {
  icon: React.ReactNode;
  iconClassName: string;
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
};

function DetailCard({
  icon,
  iconClassName,
  title,
  description,
  children,
  className,
  contentClassName,
}: DetailCardProps) {
  return (
    <section className={cn("rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6", className)}>
      <div className="flex items-center gap-3">
        <div className={cn("flex size-12 shrink-0 items-center justify-center rounded-xl", iconClassName)}>
          {icon}
        </div>
        <div className="min-w-0">
          <h2 className="text-lg font-semibold leading-none text-foreground">{title}</h2>
          {description ? <p className="mt-1 text-sm leading-6 text-muted-foreground">{description}</p> : null}
        </div>
      </div>
      <div className={cn("mt-5", contentClassName)}>{children}</div>
    </section>
  );
}

function InformationItem({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex min-w-0 gap-3 border-b border-border py-4 last:border-b-0 sm:border-b-0 sm:py-0">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-400/10 dark:text-blue-300">
        {icon}
      </div>
      <div className="min-w-0 space-y-1">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="break-words text-sm font-medium leading-6 text-foreground sm:text-base">{value}</p>
      </div>
    </div>
  );
}

function AdminProfileSummary({ detail }: { detail: AdminAccountDetail }) {
  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-center gap-4">
          <div className="flex size-[72px] shrink-0 items-center justify-center rounded-full bg-violet-100 text-xl font-semibold text-violet-700 ring-1 ring-violet-200 dark:bg-violet-400/10 dark:text-violet-200 dark:ring-violet-400/20 lg:size-20">
            {getAdminInitials(detail.fullName)}
          </div>
          <div className="min-w-0">
            <h2 className="truncate text-xl font-semibold text-foreground sm:text-2xl">{detail.fullName}</h2>
            <p className="mt-1 flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <UserRound className="size-4" aria-hidden="true" />
              Pentadbir
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 lg:max-w-[260px] lg:justify-end">
          <AdminAccountStatusBadge status={detail.accountStatus} />
          <div className="w-full space-y-1 text-sm text-muted-foreground lg:text-right">
            <p>Log masuk terakhir</p>
            <p className="font-medium text-foreground">{getAdminLastLoginLabel(detail.lastLogin)}</p>
          </div>
        </div>
      </div>
    </section>
  );
}

function AccountInformationCard({ detail }: { detail: AdminAccountDetail }) {
  return (
    <DetailCard
      icon={<UserRound className="size-6" aria-hidden="true" />}
      iconClassName="bg-indigo-50 text-indigo-600 dark:bg-indigo-400/10 dark:text-indigo-300"
      title="Maklumat Akaun"
      className="lg:col-span-8"
    >
      <div className="grid gap-x-6 sm:grid-cols-2 sm:gap-y-5">
        <InformationItem icon={<Mail className="size-4" aria-hidden="true" />} label="E-mel" value={detail.email} />
        <InformationItem icon={<Phone className="size-4" aria-hidden="true" />} label="Nombor telefon" value={detail.phone ?? "Tidak tersedia"} />
        <InformationItem icon={<CalendarDays className="size-4" aria-hidden="true" />} label="Tarikh dicipta" value={formatAdminDateTime(detail.createdAt)} />
        <InformationItem icon={<Clock3 className="size-4" aria-hidden="true" />} label="Terakhir dikemas kini" value={formatAdminDateTime(detail.updatedAt)} />
      </div>
    </DetailCard>
  );
}

function AdminStatusDialog({
  action,
  detail,
  open,
  pending,
  error,
  onOpenChange,
  onConfirm,
}: {
  action: AdminLifecycleAction;
  detail: AdminAccountDetail;
  open: boolean;
  pending: boolean;
  error?: string | null;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => Promise<boolean>;
}) {
  const targetLabel = adminAccountStatusLabels[action.targetStatus];
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
            {detail.fullName}: status semasa ialah {adminAccountStatusLabels[detail.accountStatus]}, status sasaran ialah {targetLabel}. {action.consequence}
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

function AccountControlCard({
  detail,
  pending,
  error,
  onStatusChange,
}: {
  detail: AdminAccountDetail;
  pending: boolean;
  error?: string | null;
  onStatusChange: (status: AdminStatusTarget) => Promise<boolean>;
}) {
  const [open, setOpen] = React.useState(false);
  const action = getAdminLifecycleAction(detail.accountStatus);
  const ActionIcon = action?.targetStatus === "SUSPENDED" ? TriangleAlert : action?.label === "Pulihkan Akaun" ? RotateCcw : CircleCheck;

  return (
    <DetailCard
      icon={<ShieldCheck className="size-6" aria-hidden="true" />}
      iconClassName="bg-emerald-100 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300"
      title="Kawalan Akaun"
      className="lg:col-span-4"
    >
      <div className="space-y-6">
        {action ? (
          <>
            <p className="text-sm leading-6 text-muted-foreground">
              {action.targetStatus === "SUSPENDED"
                ? "Menghalang pentadbir daripada mengakses sistem buat sementara waktu."
                : "Membenarkan pentadbir mengakses sistem semula."}
            </p>
            <Button
              type="button"
              variant={action.tone === "warning" ? "outline" : "default"}
              className={cn(
                action.targetStatus === "SUSPENDED"
                  ? cn(warningActionColorClass, "h-11 w-full gap-2 rounded-xl px-5 font-semibold")
                  : "h-11 w-full gap-2 rounded-xl bg-primary px-5 font-semibold text-primary-foreground hover:bg-primary/90"
              )}
              disabled={pending}
              onClick={() => setOpen(true)}
            >
              <ActionIcon className="size-4" aria-hidden="true" />
              {action.label}
            </Button>
            <AdminStatusDialog
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
          <p className="rounded-xl border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
            Tiada tindakan kawalan akaun sementara yang disokong untuk status ini.
          </p>
        )}
      </div>
    </DetailCard>
  );
}

function AdminSetupCard({
  detail,
  pending,
  error,
  developmentSetupUrl,
  onResendSetup,
  onCopyDevelopmentSetupUrl,
}: {
  detail: AdminAccountDetail;
  pending: boolean;
  error?: string | null;
  developmentSetupUrl?: string | null;
  onResendSetup: () => void;
  onCopyDevelopmentSetupUrl?: () => void;
}) {
  const canResend = canResendAdminSetup(detail);
  const setupMessage =
    detail.setupStatus === "COMPLETED"
      ? "Pentadbir ini telah melengkapkan penyediaan akaun."
      : detail.setupStatus === "PENDING"
        ? "Pentadbir masih belum melengkapkan penyediaan akaun."
        : detail.setupStatus === "EXPIRED"
          ? "Pautan penyediaan telah tamat tempoh."
          : detail.setupStatus === "ARCHIVED"
            ? "Penyediaan akaun tidak tersedia untuk akaun yang telah diarkibkan."
            : "Status penyediaan akaun tidak tersedia.";

  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 space-y-2">
          <div className="flex items-center gap-3">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-700 dark:bg-violet-400/10 dark:text-violet-300">
              <Mail className="size-6" aria-hidden="true" />
            </div>
            <h2 className="text-lg font-semibold leading-none text-foreground">Penyediaan Akaun</h2>
          </div>
          <p className="text-sm leading-6 text-muted-foreground">{setupMessage}</p>
        </div>
        <div className="flex w-full flex-col gap-3 sm:w-auto sm:items-end">
          {detail.setupStatus ? (
            <AdminSetupStatusBadge status={detail.setupStatus} />
          ) : (
            <span className="inline-flex h-8 min-w-[112px] items-center justify-center rounded-full border border-border bg-muted/40 px-3 text-sm font-semibold text-muted-foreground shadow-sm">
              Status tidak tersedia
            </span>
          )}
          {canResend ? (
            <Button
              type="button"
              variant="outline"
              className="h-11 w-full gap-2 rounded-xl border-violet-300 bg-violet-50 px-5 font-semibold text-violet-700 hover:bg-violet-100 dark:border-violet-400/30 dark:bg-violet-400/10 dark:text-violet-300 dark:hover:bg-violet-400/15 sm:w-auto"
              disabled={pending}
              onClick={onResendSetup}
            >
              <RefreshCw className={cn("size-4", pending && "animate-spin")} aria-hidden="true" />
              {pending ? "Menghantar..." : "Hantar Semula Setup"}
            </Button>
          ) : null}
          {canResend && developmentSetupUrl ? (
            <div className="w-full rounded-xl border border-amber-300 bg-amber-50 p-3 text-amber-900 dark:border-amber-400/25 dark:bg-amber-400/10 dark:text-amber-200 sm:w-72">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-amber-300 bg-amber-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-amber-900 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-200">
                  Pembangunan Sahaja
                </span>
                <p className="text-sm font-semibold">Pautan setup pembangunan</p>
              </div>
              <p className="mt-1 text-xs leading-5">
                Gunakan pautan ini hanya untuk ujian pembangunan tempatan.
              </p>
              <Button
                type="button"
                variant="outline"
                className="mt-3 h-10 w-full gap-2 rounded-xl border-amber-300 bg-background/70 px-4 font-semibold text-foreground hover:bg-background dark:border-amber-400/30 dark:bg-background/40 dark:hover:bg-background/60"
                onClick={onCopyDevelopmentSetupUrl}
                aria-label="Salin pautan setup pembangunan"
              >
                <Copy className="size-4" aria-hidden="true" />
                Salin Pautan Setup
              </Button>
            </div>
          ) : null}
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </div>
      </div>
    </section>
  );
}

function AdminArchiveDialog({
  detail,
  open,
  pending,
  error,
  onOpenChange,
  onConfirm,
}: {
  detail: AdminAccountDetail;
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
          <AlertDialogTitle>Arkibkan pentadbir?</AlertDialogTitle>
          <AlertDialogDescription>
            Pentadbir "{detail.fullName}" tidak lagi dapat mengakses sistem selepas akaun diarkibkan. Mengarkibkan akaun berbeza daripada menggantung sementara, dan akaun hanya boleh dipulihkan oleh Super Admin.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {error ? <p className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</p> : null}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Batal</AlertDialogCancel>
          <Button type="button" variant="destructive" disabled={pending} onClick={handleConfirm}>
            {pending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
            {pending ? "Memproses..." : "Arkibkan Pentadbir"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function AdminDangerZone({
  detail,
  pending,
  error,
  onArchive,
}: {
  detail: AdminAccountDetail;
  pending: boolean;
  error?: string | null;
  onArchive: () => Promise<boolean>;
}) {
  const [open, setOpen] = React.useState(false);

  if (!canArchiveAdmin(detail)) {
    return (
      <section className="rounded-2xl border border-destructive/30 bg-destructive/5 p-5 sm:p-6">
        <div className="flex items-center gap-4">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-700 dark:bg-red-400/10 dark:text-red-300">
            <TriangleAlert className="size-6" aria-hidden="true" />
          </div>
          <div className="space-y-1">
            <h2 className="text-lg font-semibold leading-none text-foreground">Zon Bahaya</h2>
            <p className="text-sm leading-6 text-muted-foreground">Akaun ini telah diarkibkan. Tindakan arkib tidak lagi tersedia.</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-destructive/30 bg-destructive/5 p-5 sm:p-6">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between lg:gap-6">
        <div className="flex items-center gap-4">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-700 dark:bg-red-400/10 dark:text-red-300">
            <TriangleAlert className="size-6" aria-hidden="true" />
          </div>
          <div className="space-y-1">
            <h2 className="text-lg font-semibold leading-none text-foreground">Zon Bahaya</h2>
            <p className="text-sm leading-6 text-muted-foreground">
              Arkibkan akaun apabila pentadbir tidak lagi menggunakan sistem. Akses sistem akan disekat selepas akaun diarkibkan.
            </p>
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          className="h-11 w-full gap-2 rounded-xl border-destructive/40 px-5 font-semibold text-destructive hover:bg-destructive/10 focus-visible:ring-destructive/30 lg:w-auto"
          disabled={pending}
          onClick={() => setOpen(true)}
        >
          <Archive className="size-4" aria-hidden="true" />
          Arkibkan Pentadbir
        </Button>
      </div>
      <AdminArchiveDialog
        detail={detail}
        open={open}
        pending={pending}
        error={error}
        onOpenChange={setOpen}
        onConfirm={onArchive}
      />
    </section>
  );
}

export function AdminAccountDetailSkeleton() {
  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <Skeleton className="size-20 rounded-full" />
            <div className="space-y-3">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-7 w-64" />
            </div>
          </div>
          <div className="space-y-2">
            <Skeleton className="h-8 w-28" />
            <Skeleton className="h-4 w-40" />
          </div>
        </div>
      </section>
      <div className="grid gap-6 lg:grid-cols-12">
        <Skeleton className="h-64 rounded-2xl lg:col-span-8" />
        <Skeleton className="h-64 rounded-2xl lg:col-span-4" />
      </div>
      <Skeleton className="h-44 rounded-2xl" />
      <Skeleton className="h-40 rounded-2xl" />
    </div>
  );
}

export function AdminAccountDetailView({
  detail,
  statusPending,
  resendPending,
  statusError,
  resendError,
  archiveError,
  developmentSetupUrl,
  onStatusChange,
  onResendSetup,
  onCopyDevelopmentSetupUrl,
  onArchive,
}: AdminAccountDetailViewProps) {
  return (
    <div className="space-y-6">
      <AdminProfileSummary detail={detail} />
      <div className="grid gap-6 lg:grid-cols-12">
        <AccountInformationCard detail={detail} />
        <AccountControlCard
          detail={detail}
          pending={statusPending}
          error={statusError}
          onStatusChange={onStatusChange}
        />
      </div>
      <AdminSetupCard
        detail={detail}
        pending={resendPending}
        error={resendError}
        developmentSetupUrl={developmentSetupUrl}
        onResendSetup={onResendSetup}
        onCopyDevelopmentSetupUrl={onCopyDevelopmentSetupUrl}
      />
      <AdminDangerZone
        detail={detail}
        pending={statusPending}
        error={archiveError}
        onArchive={onArchive}
      />
    </div>
  );
}
