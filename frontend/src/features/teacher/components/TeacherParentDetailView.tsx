import * as React from "react";
import { Archive, CalendarDays, CircleCheck, Clock3, LoaderCircle, Mail, Phone, RefreshCw, ShieldCheck, TriangleAlert, UserRound, UsersRound } from "lucide-react";
import { Link } from "react-router-dom";

import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { AdminAccountStatusBadge } from "@/features/admin/components/AdminAccountStatusBadge";
import { AdminSetupStatusBadge } from "@/features/admin/components/AdminSetupStatusBadge";
import { warningActionColorClass } from "@/features/admin/utils/action-styles";
import type { TeacherParentDetail, TeacherParentStatusUpdatePayload } from "@/features/teacher/types/teacher-parent.types";
import { formatTeacherParentDate, teacherParentInitials, teacherParentRelationshipLabel, teacherParentSetupStatus, teacherParentStatusLabel } from "@/features/teacher/utils/teacher-parent";
import { teacherStudentInitials } from "@/features/teacher/utils/teacher-student";
import { cn } from "@/lib/utils";

function SectionCard({ icon, iconClassName, title, children, className }: { icon: React.ReactNode; iconClassName: string; title: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("flex h-full flex-col rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5", className)}>
      <div className="flex items-center gap-3">
        <div className={cn("flex size-11 shrink-0 items-center justify-center rounded-xl", iconClassName)}>{icon}</div>
        <h2 className="text-lg font-semibold leading-none text-foreground">{title}</h2>
      </div>
      <div className="mt-5 flex flex-1 flex-col">{children}</div>
    </section>
  );
}

function DetailRow({ label, value, icon }: { label: string; value: React.ReactNode; icon: React.ReactNode }) {
  return (
    <div className="flex min-w-0 gap-3">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">{icon}</div>
      <div className="min-w-0">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="mt-1 break-words text-sm font-semibold leading-6 text-foreground sm:text-base">{value}</p>
      </div>
    </div>
  );
}

function ParentSummaryCard({ detail }: { detail: TeacherParentDetail }) {
  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-center gap-4">
          <Avatar className="size-16 shrink-0 rounded-2xl sm:size-20">
            {detail.avatar ? <AvatarImage src={detail.avatar} alt={`Avatar ${detail.fullName}`} /> : null}
            <AvatarFallback className="rounded-2xl bg-secondary/10 text-xl font-bold text-secondary ring-1 ring-secondary/20">{teacherParentInitials(detail.fullName)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <h1 className="break-words text-2xl font-semibold tracking-tight text-foreground">{detail.fullName}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{detail.email ?? "E-mel tidak tersedia"}</p>
            <p className="mt-2 text-sm text-muted-foreground">
              {teacherParentRelationshipLabel(detail.relationship)} · {detail.studentCount} anak
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-3 lg:max-w-[280px] lg:justify-end">
          <AdminAccountStatusBadge status={detail.accountStatus} />
          <p className="w-full text-sm text-muted-foreground lg:text-right">
            Log masuk terakhir: <span className="font-semibold text-foreground">{formatTeacherParentDate(detail.lastLogin, "Belum pernah log masuk")}</span>
          </p>
        </div>
      </div>
    </section>
  );
}

function lifecycleAction(status: TeacherParentDetail["accountStatus"]) {
  if (status === "ACTIVE") return { target: "SUSPENDED" as const, label: "Gantung Akaun", icon: <TriangleAlert className="size-4" aria-hidden="true" />, tone: "warning" as const };
  if (status === "SUSPENDED") return { target: "ACTIVE" as const, label: "Aktifkan Akaun", icon: <CircleCheck className="size-4" aria-hidden="true" />, tone: "default" as const };
  return null;
}

function accountStatusContent(status: TeacherParentDetail["accountStatus"]) {
  if (status === "ACTIVE") {
    return {
      title: "Aktif",
      description: "Akaun ibu bapa sedang aktif dan boleh digunakan untuk log masuk.",
      helper: "Menggantung akaun akan menyekat akses log masuk buat sementara waktu tanpa memadam pautan murid.",
    };
  }

  if (status === "SUSPENDED") {
    return {
      title: "Digantung",
      description: "Akaun ibu bapa sedang digantung dan tidak boleh digunakan untuk log masuk.",
      helper: "Mengaktifkan semula akaun akan memulihkan akses log masuk ibu bapa.",
    };
  }

  if (status === "ARCHIVED") {
    return {
      title: "Diarkibkan",
      description: "Akaun ibu bapa telah diarkibkan dan tidak boleh digunakan untuk log masuk.",
      helper: "Akaun yang telah diarkibkan tidak mempunyai tindakan arkib tambahan.",
    };
  }

  return {
    title: "Menunggu",
    description: "Akaun ibu bapa sedang menunggu proses penyediaan akaun.",
    helper: "Ibu bapa belum menetapkan kata laluan dan belum boleh menggunakan akaun untuk log masuk.",
  };
}

function setupState(detail: TeacherParentDetail): ReturnType<typeof teacherParentSetupStatus> {
  return teacherParentSetupStatus(detail);
}

function ParentStudentCard({ detail }: { detail: TeacherParentDetail }) {
  return (
    <SectionCard icon={<UsersRound className="size-6" aria-hidden="true" />} iconClassName="bg-secondary/10 text-secondary" title="Anak Dipautkan">
      {detail.students.length > 0 ? (
        <div className="space-y-3">
          {detail.students.map((student) => (
            <div key={student.id} className="flex flex-col gap-4 rounded-xl border border-border bg-background/40 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-center gap-3">
                <Avatar className="size-10">
                  {student.student.avatar ? <AvatarImage src={student.student.avatar} alt="" /> : null}
                  <AvatarFallback className="bg-secondary/10 text-xs font-semibold text-secondary">{teacherStudentInitials(student.student.fullName)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="break-words text-sm font-semibold text-foreground">{student.student.fullName}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{student.student.studentId}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {student.student.class.yearLevel} {student.student.class.className} · Tahun {student.student.class.yearLevel} · {teacherParentRelationshipLabel(student.relationship)}
                  </p>
                </div>
              </div>
              <Button asChild variant="outline" size="sm" className="h-10 w-full shrink-0 rounded-lg px-3 sm:w-auto">
                <Link to={`/guru/murid/${student.student.id}`} aria-label={`Lihat murid ${student.student.fullName}`}>
                  Lihat Murid
                </Link>
              </Button>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex h-full flex-col justify-center rounded-xl border border-dashed border-border bg-background/30 p-5">
          <p className="text-sm font-semibold text-foreground">Belum ada murid dipautkan.</p>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">Murid yang dipautkan kepada ibu bapa atau penjaga ini akan dipaparkan di sini.</p>
        </div>
      )}
    </SectionCard>
  );
}

function DangerZone({ detail, pending, onArchive }: { detail: TeacherParentDetail; pending: boolean; onArchive: () => void }) {
  if (detail.accountStatus === "ARCHIVED") {
    return (
      <section className="rounded-2xl border border-destructive/35 bg-destructive/5 p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
              <Archive className="size-6" aria-hidden="true" />
            </div>
            <div className="space-y-1">
              <h2 className="text-lg font-semibold leading-none text-foreground">Zon Bahaya</h2>
              <p className="text-sm leading-6 text-muted-foreground">Akaun ibu bapa telah diarkibkan dan tidak mempunyai tindakan arkib tambahan.</p>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-destructive/35 bg-destructive/5 p-4 shadow-sm sm:p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
            <TriangleAlert className="size-6" aria-hidden="true" />
          </div>
          <div className="space-y-1">
            <h2 className="text-lg font-semibold leading-none text-foreground">Zon Bahaya</h2>
            <p className="text-sm leading-6 text-muted-foreground">Mengarkibkan akaun akan menutup akses log masuk ibu bapa atau penjaga.</p>
            <p className="text-sm leading-6 text-muted-foreground">Pautan murid dan rekod berkaitan akan dikekalkan untuk tujuan audit.</p>
          </div>
        </div>
        <Button type="button" variant="outline" className="h-11 w-full gap-2 rounded-xl border border-destructive/40 px-6 font-semibold text-destructive shadow-sm hover:bg-destructive/10 focus-visible:ring-destructive/30 sm:w-auto" disabled={pending} onClick={onArchive}>
          <Archive className="size-4" aria-hidden="true" />
          {pending ? "Mengarkibkan..." : "Arkibkan Ibu Bapa"}
        </Button>
      </div>
    </section>
  );
}

export function TeacherParentDetailView({
  detail,
  statusPending,
  resendPending,
  statusError,
  resendError,
  onStatusChange,
  onResendSetup,
}: {
  detail: TeacherParentDetail;
  statusPending: boolean;
  resendPending: boolean;
  statusError?: string | null;
  resendError?: string | null;
  onStatusChange: (status: TeacherParentStatusUpdatePayload["status"]) => Promise<boolean>;
  onResendSetup: () => Promise<void>;
}) {
  const [statusOpen, setStatusOpen] = React.useState(false);
  const [resendOpen, setResendOpen] = React.useState(false);
  const [archiveOpen, setArchiveOpen] = React.useState(false);
  const action = lifecycleAction(detail.accountStatus);
  const accountContent = accountStatusContent(detail.accountStatus);
  const setup = setupState(detail);

  const confirmStatus = async (status: TeacherParentStatusUpdatePayload["status"]) => {
    const ok = await onStatusChange(status);
    if (ok) setStatusOpen(false);
    return ok;
  };

  const handleResend = async () => {
    await onResendSetup();
    setResendOpen(false);
  };

  return (
    <div className="space-y-6">
      <ParentSummaryCard detail={detail} />

      <div className="grid items-stretch gap-6 lg:grid-cols-2">
        <SectionCard icon={<UserRound className="size-6" aria-hidden="true" />} iconClassName="bg-secondary/10 text-secondary" title="Maklumat Ibu Bapa" className="h-full">
          <div className="grid gap-x-8 gap-y-5 md:grid-cols-2">
            <DetailRow icon={<UserRound className="size-4" />} label="Nama Penuh" value={detail.fullName} />
            <DetailRow icon={<Mail className="size-4" />} label="E-mel" value={detail.email ?? "Tidak tersedia"} />
            <DetailRow icon={<Phone className="size-4" />} label="Nombor Telefon" value={detail.phone} />
            <DetailRow icon={<UsersRound className="size-4" />} label="Hubungan" value={teacherParentRelationshipLabel(detail.relationship)} />
            <DetailRow icon={<CalendarDays className="size-4" />} label="Tarikh Dicipta" value={formatTeacherParentDate(detail.createdAt)} />
            <DetailRow icon={<Clock3 className="size-4" />} label="Terakhir Dikemas Kini" value={formatTeacherParentDate(detail.updatedAt)} />
          </div>
        </SectionCard>

        <SectionCard icon={<ShieldCheck className="size-6" aria-hidden="true" />} iconClassName={detail.accountStatus === "SUSPENDED" ? "bg-slate-100 text-slate-700 dark:bg-slate-400/10 dark:text-slate-300" : "bg-emerald-100 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300"} title="Kawalan Akaun" className="h-full">
          <div className="flex h-full flex-col">
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-4 rounded-xl border border-border bg-background/40 p-3">
                <span className="text-sm font-medium text-muted-foreground">Status Akaun</span>
                <AdminAccountStatusBadge status={detail.accountStatus} />
              </div>
              <div className="rounded-xl border border-border bg-background/40 p-3">
                <h3 className="text-base font-semibold text-foreground">{accountContent.title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{accountContent.description}</p>
              </div>
            </div>
            <div className="mt-auto border-t border-border pt-4">
              <p className="text-sm leading-6 text-muted-foreground">{accountContent.helper}</p>
            {action ? (
              <>
                <Button
                  type="button"
                  variant={action.tone === "warning" ? "outline" : "default"}
                  className={cn(action.tone === "warning" ? cn(warningActionColorClass, "mt-3 h-11 w-full gap-2 rounded-xl px-6 font-semibold") : "mt-3 h-11 w-full gap-2 rounded-xl bg-primary px-6 font-semibold text-primary-foreground hover:bg-primary/90")}
                  disabled={statusPending}
                  onClick={() => setStatusOpen(true)}
                >
                  {statusPending ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : action.icon}
                  {statusPending ? "Memproses..." : action.label}
                </Button>
              </>
            ) : null}
            {statusError ? <p className="mt-3 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive" role="alert">{statusError}</p> : null}
            </div>
          </div>
        </SectionCard>
      </div>

      <div className="grid items-stretch gap-6 lg:grid-cols-2">
        <SectionCard icon={<Mail className="size-6" aria-hidden="true" />} iconClassName="bg-sky-100 text-sky-700 dark:bg-sky-400/10 dark:text-sky-300" title="Penyediaan Akaun" className="h-full">
          <div className="flex h-full flex-col gap-4">
            <div className="flex items-center justify-between gap-4 rounded-xl border border-border bg-background/40 p-3">
              <span className="text-sm font-medium text-muted-foreground">Status Penyediaan</span>
              <AdminSetupStatusBadge status={setup} />
            </div>
            <DetailRow icon={<Mail className="size-4" />} label="E-mel Log Masuk" value={detail.email ?? "Tidak tersedia"} />
            <p className="text-sm leading-6 text-muted-foreground">
              {setup === "COMPLETED"
                ? "Ibu bapa telah melengkapkan penyediaan akaun dan boleh log masuk menggunakan e-mel serta kata laluan."
                : setup === "ARCHIVED"
                  ? "Akaun ini telah diarkibkan."
                  : setup === "EXPIRED"
                    ? "Pautan penyediaan akaun telah tamat tempoh."
                    : "Ibu bapa belum melengkapkan penyediaan akaun."}
            </p>
            {setup === "PENDING" || setup === "EXPIRED" ? <Button type="button" variant="outline" className="mt-auto h-11 w-full gap-2 rounded-xl px-5 font-semibold" disabled={resendPending} onClick={() => setResendOpen(true)}>{resendPending ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : <RefreshCw className="size-4" aria-hidden="true" />} {resendPending ? "Menghantar..." : "Hantar Semula E-mel Setup"}</Button> : null}
            {setup === "COMPLETED" && detail.updatedAt ? <p className="text-sm leading-6 text-muted-foreground">Penyediaan selesai pada {formatTeacherParentDate(detail.updatedAt)}.</p> : null}
            {setup === "ARCHIVED" ? <p className="text-sm leading-6 text-muted-foreground">Tindakan hantar semula tidak tersedia untuk rekod yang diarkibkan.</p> : null}
            {resendError ? <p className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive" role="alert">{resendError}</p> : null}
          </div>
        </SectionCard>

        <ParentStudentCard detail={detail} />
      </div>

      <DangerZone detail={detail} pending={statusPending} onArchive={() => setArchiveOpen(true)} />

      <AlertDialog open={statusOpen} onOpenChange={setStatusOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{action?.label ?? "Kemas kini status?"}</AlertDialogTitle>
            <AlertDialogDescription>Status semasa ialah {teacherParentStatusLabel(detail.accountStatus)}.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-11 rounded-xl px-5" disabled={statusPending}>Batal</AlertDialogCancel>
            <Button type="button" className="h-11 rounded-xl px-5" disabled={statusPending} onClick={async () => {
              if (!action) return;
              await confirmStatus(action.target);
            }}>
              {statusPending ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : action?.icon}
              {statusPending ? "Memproses..." : action?.label}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={resendOpen} onOpenChange={setResendOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hantar semula e-mel setup?</AlertDialogTitle>
            <AlertDialogDescription>E-mel penyediaan akaun akan dihantar semula kepada ibu bapa.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-11 rounded-xl px-5" disabled={resendPending}>Batal</AlertDialogCancel>
            <Button type="button" className="h-11 rounded-xl px-5" disabled={resendPending} onClick={handleResend}>
              {resendPending ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : <RefreshCw className="size-4" aria-hidden="true" />}
              {resendPending ? "Menghantar..." : "Hantar Semula E-mel Setup"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={archiveOpen} onOpenChange={setArchiveOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Arkibkan ibu bapa ini?</AlertDialogTitle>
            <AlertDialogDescription>Akaun akan diarkibkan dan akses log masuk akan ditutup.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-11 rounded-xl px-5" disabled={statusPending}>Batal</AlertDialogCancel>
            <Button
              type="button"
              className={cn("h-11 rounded-xl px-5 font-semibold", warningActionColorClass)}
              disabled={statusPending}
              onClick={async () => {
                await confirmStatus("ARCHIVED");
                setArchiveOpen(false);
              }}
            >
              {statusPending ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : <Archive className="size-4" aria-hidden="true" />}
              {statusPending ? "Memproses..." : "Arkibkan Ibu Bapa"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
