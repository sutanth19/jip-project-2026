import * as React from "react";
import {
  Archive,
  Building2,
  CalendarDays,
  Check,
  CircleCheck,
  Copy,
  Eye,
  EyeOff,
  Info,
  KeyRound,
  RotateCcw,
  School,
  ShieldCheck,
  TriangleAlert,
  UserRoundX,
  UsersRound,
  X,
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
import { Link } from "react-router-dom";
import { AdminAccountStatusBadge } from "@/features/admin/components/AdminAccountStatusBadge";
import type { TeacherStudentDetail, TeacherStudentPinResetResult, TeacherStudentStatus } from "@/features/teacher/types/teacher-student.types";
import { teacherClassDisplayLabel, teacherClassYearLabel } from "@/features/teacher/utils/teacher-class";
import { teacherStudentInitials, teacherStudentRemedialSkillLabel } from "@/features/teacher/utils/teacher-student";
import { formatDateTime } from "@/utils/date";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

function formatStudentDateTime(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Tidak tersedia" : formatDateTime(date);
}

function genderLabel(value: TeacherStudentDetail["gender"]): string {
  return value === "FEMALE" ? "Perempuan" : "Lelaki";
}

function SectionCard({
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

function studentStatusMeta(status: TeacherStudentStatus) {
  if (status === "SUSPENDED") {
    return {
      label: "Digantung",
      description: "Akaun murid sedang digantung dan tidak boleh digunakan untuk log masuk.",
      actionLabel: "Aktifkan Akaun",
      actionIcon: <CircleCheck className="size-4" aria-hidden="true" />,
      targetStatus: "ACTIVE" as const,
      helper: "Mengaktifkan semula akaun akan membolehkan murid log masuk menggunakan ID Murid dan PIN.",
      tone: "success" as const,
    };
  }

  if (status === "ARCHIVED") {
    return {
      label: "Diarkibkan",
      description: "Akaun murid telah diarkibkan dan tidak boleh digunakan untuk log masuk.",
      actionLabel: null,
      actionIcon: null,
      targetStatus: null,
      helper: "Akaun yang telah diarkibkan tidak boleh digunakan untuk log masuk.",
      tone: "neutral" as const,
    };
  }

  return {
    label: "Aktif",
    description: "Akaun murid sedang aktif dan boleh digunakan untuk log masuk.",
    actionLabel: "Gantung Akaun",
    actionIcon: <TriangleAlert className="size-4" aria-hidden="true" />,
    targetStatus: "SUSPENDED" as const,
    helper: "Menggantung akaun akan menyekat log masuk murid buat sementara waktu tanpa memadam rekod pembelajaran.",
    tone: "warning" as const,
  };
}

function StudentPinResetSection({
  detail,
  onResetPin,
  onCopyLoginInfo,
}: {
  detail: TeacherStudentDetail;
  onResetPin?: () => Promise<TeacherStudentPinResetResult>;
  onCopyLoginInfo?: (text: string) => Promise<void> | void;
}) {
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [successOpen, setSuccessOpen] = React.useState(false);
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [result, setResult] = React.useState<TeacherStudentPinResetResult | null>(null);
  const [visible, setVisible] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  const [copyError, setCopyError] = React.useState<string | null>(null);
  const [closeConfirmOpen, setCloseConfirmOpen] = React.useState(false);

  React.useEffect(() => {
    if (!copied || !successOpen) return undefined;

    const timeout = window.setTimeout(() => setCopied(false), 2500);
    return () => window.clearTimeout(timeout);
  }, [copied, successOpen]);

  if (!onResetPin) return null;

  const handleConfirm = async () => {
    setPending(true);
    setError(null);
    try {
      const next = await onResetPin();
      setResult(next);
      setVisible(false);
      setCopied(false);
      setCopyError(null);
      setConfirmOpen(false);
      setSuccessOpen(true);
    } catch {
      setError("PIN murid tidak dapat ditetapkan semula. Sila cuba lagi.");
    } finally {
      setPending(false);
    }
  };

  const clearGeneratedPinState = () => {
    setSuccessOpen(false);
    setCloseConfirmOpen(false);
    setResult(null);
    setVisible(false);
    setCopied(false);
    setCopyError(null);
  };

  const requestSuccessClose = () => {
    if (!result) {
      clearGeneratedPinState();
      return;
    }

    if (copied) {
      clearGeneratedPinState();
      return;
    }

    setCloseConfirmOpen(true);
  };

  const handleSuccessOpenChange = (open: boolean) => {
    if (open) {
      setSuccessOpen(true);
      return;
    }

    requestSuccessClose();
  };

  const copyText = result
    ? [
        "DIGITAL MAIN-LiT",
        "",
        `Nama Murid: ${detail.fullName}`,
        `ID Murid: ${result.credentials.studentId}`,
        `PIN: ${result.credentials.temporaryPin}`,
        "",
        "Log masuk menggunakan ID Murid dan PIN.",
      ].join("\n")
    : "";

  const handleCopy = async () => {
    if (!result) return;
    setCopyError(null);
    try {
      if (onCopyLoginInfo) {
        await onCopyLoginInfo(copyText);
      } else {
        await navigator.clipboard.writeText(copyText);
      }
      setCopied(true);
    } catch {
      setCopyError("Maklumat tidak dapat disalin secara automatik. Sila catat ID Murid dan PIN sebelum menutup dialog.");
    }
  };

  return (
    <>
      <div className="flex h-full flex-col gap-3">
        <div className="rounded-xl border border-border bg-background/40 p-4">
          <div className="grid gap-x-6 gap-y-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
            <p className="text-sm text-muted-foreground">ID Murid</p>
            <p className="break-words text-sm font-semibold text-foreground sm:text-base">{detail.studentId}</p>
            <p className="text-sm text-muted-foreground">Kaedah Log Masuk</p>
            <p className="text-sm font-semibold text-foreground">ID Murid dan PIN 4 digit</p>
            <p className="text-sm text-muted-foreground">Status PIN</p>
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary/10 px-2.5 py-1 text-xs font-semibold text-secondary ring-1 ring-secondary/20">
                <KeyRound className="size-3.5" aria-hidden="true" />
                PIN Sulit
              </span>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-secondary/25 bg-secondary/5 p-3">
          <div className="flex gap-3">
            <Info className="mt-0.5 size-4 shrink-0 text-secondary" aria-hidden="true" />
            <p className="text-sm leading-6 text-muted-foreground">
              PIN tidak disimpan dalam bentuk yang boleh dibaca dan hanya dijana semula apabila diperlukan.
            </p>
          </div>
        </div>

        <div className="mt-auto">
          <Button type="button" variant="outline" className="h-11 w-full gap-2 rounded-xl border-secondary/60 bg-secondary/5 px-6 font-semibold text-secondary hover:bg-secondary/10 hover:text-secondary focus-visible:ring-secondary/30" onClick={() => setConfirmOpen(true)}>
            <RotateCcw className="size-4" aria-hidden="true" />
            Tetapkan Semula PIN
          </Button>
        </div>

        <div className="sr-only">
          <h3>Maklumat log masuk dijana oleh sistem</h3>
          <p>ID Murid dan PIN 4 digit dijana secara selamat dan hanya dipaparkan sekali.</p>
          <p>PIN disulitkan dan tidak boleh dilihat semula.</p>
          <div>
            <span>ID Murid</span>
            <span>PIN sulit</span>
          </div>
        </div>
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={(open) => !pending && setConfirmOpen(open)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tetapkan semula PIN murid?</AlertDialogTitle>
            <AlertDialogDescription>PIN lama tidak lagi boleh digunakan. Sistem akan menjana PIN 4 digit baharu dan memaparkannya sekali sahaja.</AlertDialogDescription>
          </AlertDialogHeader>
          {error ? <p className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive" role="alert">{error}</p> : null}
          <AlertDialogFooter>
            <AlertDialogCancel className="h-11 rounded-xl px-5" disabled={pending}>Batal</AlertDialogCancel>
            <Button type="button" className="h-11 gap-2 rounded-xl bg-primary px-5 font-semibold text-primary-foreground hover:bg-primary/90" disabled={pending} onClick={() => void handleConfirm()}>
              <KeyRound className="size-4" aria-hidden="true" />
              {pending ? "Menjana..." : "Jana PIN Baharu"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={successOpen} onOpenChange={handleSuccessOpenChange}>
        <AlertDialogContent
          className="w-[calc(100%-2rem)] max-w-2xl overflow-hidden rounded-2xl border border-border bg-card p-0 shadow-2xl"
          onEscapeKeyDown={(event) => {
            event.preventDefault();
            requestSuccessClose();
          }}
        >
          <div className="space-y-6 px-6 pt-6 sm:px-8 sm:pt-8">
            <div className="flex items-start gap-4 pr-12">
              <div className="flex size-14 shrink-0 items-center justify-center rounded-full bg-secondary/15 text-secondary ring-1 ring-secondary/25">
                <CircleCheck className="size-8" aria-hidden="true" />
              </div>
              <AlertDialogHeader className="gap-2 text-left">
                <AlertDialogTitle className="text-2xl font-semibold tracking-normal text-foreground">PIN Baharu Berjaya Dijana</AlertDialogTitle>
                <AlertDialogDescription className="text-base leading-7 text-muted-foreground">
                  Berikan maklumat ini kepada murid. PIN hanya akan dipaparkan sekali.
                </AlertDialogDescription>
              </AlertDialogHeader>
            </div>

            <Button
              type="button"
              variant="ghost"
              className="absolute right-4 top-4 size-11 rounded-full p-0 text-muted-foreground hover:bg-muted/60 hover:text-foreground focus-visible:ring-primary/30"
              aria-label="Tutup dialog PIN baharu"
              onClick={requestSuccessClose}
            >
              <X className="size-5" aria-hidden="true" />
            </Button>

            {result ? (
              <div className="rounded-2xl border border-border bg-background/30 p-5 sm:p-6">
                <div className="grid gap-5 sm:grid-cols-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-muted-foreground">Nama Murid</p>
                    <p className="mt-2 break-words text-lg font-semibold leading-7 text-foreground">{detail.fullName}</p>
                  </div>
                  <div className="min-w-0 sm:border-l sm:border-border sm:pl-6">
                    <p className="text-sm font-medium text-muted-foreground">ID Murid</p>
                    <p className="mt-2 break-words text-lg font-semibold leading-7 text-foreground">{result.credentials.studentId}</p>
                  </div>
                </div>

                <div className="my-5 border-t border-border" />

                <div>
                  <p className="text-sm font-medium text-muted-foreground">PIN Baharu</p>
                  <div className="mt-3 flex min-h-20 flex-col items-stretch gap-3 rounded-xl border border-border bg-background/40 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0 flex-1 text-center">
                      <p className="font-mono text-2xl font-semibold tracking-[0.3em] text-secondary sm:text-3xl" aria-live="polite">
                        {visible ? result.credentials.temporaryPin.split("").join(" ") : "••••"}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      className="h-11 gap-2 rounded-xl px-4 font-semibold text-secondary hover:bg-secondary/10 hover:text-secondary focus-visible:ring-secondary/30"
                      onClick={() => setVisible((value) => !value)}
                      aria-label={visible ? "Sembunyikan PIN baharu" : "Tunjukkan PIN baharu"}
                    >
                      {visible ? <EyeOff className="size-4" aria-hidden="true" /> : <Eye className="size-4" aria-hidden="true" />}
                      {visible ? "Sembunyikan" : "Tunjukkan"}
                    </Button>
                  </div>
                </div>
              </div>
            ) : null}

            <div className="flex items-start gap-4 rounded-xl border border-accent/40 bg-accent/5 p-4">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent">
                <TriangleAlert className="size-6" aria-hidden="true" />
              </div>
              <div>
                <p className="font-semibold text-accent">PIN hanya dipaparkan sekali</p>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  Salin atau catat ID Murid dan PIN sebelum menutup dialog. PIN tidak boleh dilihat semula selepas dialog ditutup.
                </p>
              </div>
            </div>

            {copyError ? (
              <p className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive" role="alert">
                {copyError}
              </p>
            ) : null}

            <p className="sr-only" aria-live="polite">{copied ? "ID dan PIN telah disalin" : ""}</p>
          </div>

          <div className="mt-6 border-t border-border px-6 py-5 sm:px-8">
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Button type="button" variant="outline" className="h-12 w-full gap-2 rounded-xl px-5 font-semibold sm:w-auto" onClick={() => void handleCopy()}>
                {copied ? <Check className="size-4" aria-hidden="true" /> : <Copy className="size-4" aria-hidden="true" />}
                {copied ? "ID dan PIN telah disalin" : "Salin ID dan PIN"}
              </Button>
              <Button type="button" className="h-12 w-full rounded-xl px-6 font-semibold sm:w-auto" onClick={clearGeneratedPinState}>
                Selesai
              </Button>
            </div>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={closeConfirmOpen} onOpenChange={setCloseConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Maklumat belum disalin</AlertDialogTitle>
            <AlertDialogDescription>
              PIN ini tidak boleh dilihat semula selepas dialog ditutup. Adakah anda pasti mahu menutup dialog tanpa menyalin maklumat?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-11 rounded-xl px-5">Kembali</AlertDialogCancel>
            <Button type="button" variant="destructive" className="h-11 rounded-xl px-5 font-semibold" onClick={clearGeneratedPinState}>
              Tutup Tanpa Menyalin
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function StudentSummary({ detail }: { detail: TeacherStudentDetail }) {
  const metadata = [
    teacherClassDisplayLabel(detail.class),
    teacherClassYearLabel(detail.class.yearLevel),
    detail.school.schoolName,
  ].filter(Boolean);

  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-center gap-4">
          <Avatar className="size-16 shrink-0 rounded-2xl sm:size-20">
            {detail.avatar ? <AvatarImage src={detail.avatar} alt={`Avatar ${detail.fullName}`} /> : null}
            <AvatarFallback className="rounded-2xl bg-secondary/10 text-xl font-bold text-secondary ring-1 ring-secondary/20">{teacherStudentInitials(detail.fullName)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <h1 className="break-words text-2xl font-semibold tracking-tight text-foreground">{detail.fullName}</h1>
            <p className="mt-1 text-sm font-medium text-muted-foreground">{detail.studentId}</p>
            <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
              <School className="size-4 shrink-0" aria-hidden="true" />
              {metadata.map((item, index) => (
                <React.Fragment key={`${item}-${index}`}>
                  {index > 0 ? <span aria-hidden="true">|</span> : null}
                  <span className="break-words">{item}</span>
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 lg:items-end lg:text-right">
          <AdminAccountStatusBadge status={detail.accountStatus} />
          <p className="text-sm text-muted-foreground">{detail.linkedParentCount} ibu bapa / penjaga dipautkan</p>
        </div>
      </div>
    </section>
  );
}

function StudentInformationCard({ detail, className }: { detail: TeacherStudentDetail; className?: string }) {
  return (
    <SectionCard icon={<UsersRound className="size-6" aria-hidden="true" />} iconClassName="bg-secondary/10 text-secondary" title="Maklumat Murid" className={className}>
      <div className="grid gap-x-8 gap-y-5 md:grid-cols-2">
        <DetailRow icon={<UsersRound className="size-4" aria-hidden="true" />} label="Nama Penuh" value={detail.fullName} />
        <DetailRow icon={<School className="size-4" aria-hidden="true" />} label="ID Murid" value={detail.studentId} />
        <DetailRow icon={<CalendarDays className="size-4" aria-hidden="true" />} label="Jantina" value={genderLabel(detail.gender)} />
        <DetailRow icon={<Check className="size-4" aria-hidden="true" />} label="Tahap Pemulihan" value={teacherStudentRemedialSkillLabel(detail.remedialSkill)} />
        <DetailRow icon={<CalendarDays className="size-4" aria-hidden="true" />} label="Tarikh Dicipta" value={formatStudentDateTime(detail.createdAt)} />
        <DetailRow icon={<CalendarDays className="size-4" aria-hidden="true" />} label="Terakhir Dikemas Kini" value={formatStudentDateTime(detail.updatedAt)} />
      </div>
    </SectionCard>
  );
}

function StudentLoginCard({
  detail,
  onResetPin,
  onCopyLoginInfo,
  className,
}: {
  detail: TeacherStudentDetail;
  onResetPin?: () => Promise<TeacherStudentPinResetResult>;
  onCopyLoginInfo?: (text: string) => Promise<void> | void;
  className?: string;
}) {
  return (
    <SectionCard icon={<KeyRound className="size-6" aria-hidden="true" />} iconClassName="bg-secondary/10 text-secondary" title="Maklumat Log Masuk" className={className}>
      <div className="flex h-full flex-col">
        <StudentPinResetSection detail={detail} onResetPin={onResetPin} onCopyLoginInfo={onCopyLoginInfo} />
      </div>
    </SectionCard>
  );
}

function StudentSchoolCard({ detail, className }: { detail: TeacherStudentDetail; className?: string }) {
  return (
    <section className={cn("rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5", className)}>
      <div className="grid gap-5 lg:grid-cols-[1.3fr_1fr_1fr_1fr] lg:items-center">
        <div className="flex min-w-0 gap-3">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Building2 className="size-5" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <h2 className="text-lg font-semibold leading-none text-foreground">Maklumat Sekolah</h2>
            <p className="mt-1 text-sm text-muted-foreground">Sekolah</p>
            <p className="break-words text-sm font-semibold leading-6 text-foreground sm:text-base">{detail.school.schoolName}</p>
          </div>
        </div>
        <DetailRow icon={<School className="size-4" aria-hidden="true" />} label="Kod Sekolah" value={detail.school.schoolCode} />
        <DetailRow icon={<CalendarDays className="size-4" aria-hidden="true" />} label="Kelas Asal" value={teacherClassDisplayLabel(detail.class)} />
        <DetailRow icon={<CalendarDays className="size-4" aria-hidden="true" />} label="Sesi Akademik" value={detail.class.academicYear} />
      </div>
    </section>
  );
}

function StudentParentCard({ detail, className }: { detail: TeacherStudentDetail; className?: string }) {
  return (
    <SectionCard icon={<UsersRound className="size-6" aria-hidden="true" />} iconClassName="bg-emerald-100 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300" title="Ibu Bapa / Penjaga" className={className}>
      {detail.parents.length > 0 ? (
        <div className="space-y-3">
          {detail.parents.map((parent) => (
            <div key={parent.id} className="flex items-center justify-between gap-4 rounded-xl border border-border bg-background/40 p-4">
              <div className="min-w-0">
                <p className="break-words text-base font-semibold text-foreground">{parent.fullName}</p>
                <p className="mt-1 text-sm text-muted-foreground">{parent.relationship}</p>
              </div>
              {parent.avatar ? <Avatar className="size-10 shrink-0"><AvatarImage src={parent.avatar} alt="" /><AvatarFallback>{teacherStudentInitials(parent.fullName)}</AvatarFallback></Avatar> : null}
            </div>
          ))}
        </div>
      ) : (
        <div className="flex h-full flex-col justify-center rounded-xl border border-dashed border-border bg-background/30 p-5 sm:flex-row sm:items-center sm:justify-center sm:gap-5">
          <div className="mb-4 flex size-16 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground sm:mb-0">
            <UsersRound className="size-8" aria-hidden="true" />
          </div>
          <div className="max-w-md">
            <p className="text-sm font-semibold text-foreground">Belum ada ibu bapa / penjaga dipautkan.</p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">Maklumat ibu bapa atau penjaga akan dipaparkan selepas proses pemautan akaun dilengkapkan.</p>
          </div>
        </div>
      )}
    </SectionCard>
  );
}

function StudentAccountControlCard({
  detail,
  onStatusChange,
}: {
  detail: TeacherStudentDetail;
  onStatusChange?: (status: "ACTIVE" | "SUSPENDED" | "ARCHIVED") => Promise<void>;
}) {
  const [open, setOpen] = React.useState(false);
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const action = studentStatusMeta(detail.accountStatus);

  if (action.targetStatus === null) {
    return (
      <SectionCard icon={<ShieldCheck className="size-6" aria-hidden="true" />} iconClassName="bg-slate-100 text-slate-700 dark:bg-slate-400/10 dark:text-slate-300" title="Kawalan Akaun" className="h-full">
        <div className="flex h-full flex-col">
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4 rounded-xl border border-border bg-background/40 p-3">
              <span className="text-sm font-medium text-muted-foreground">Status Akaun</span>
              <AdminAccountStatusBadge status={detail.accountStatus} />
            </div>
            <div className="rounded-xl border border-border bg-background/40 p-3">
              <h3 className="text-base font-semibold text-foreground">{action.label}</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{action.description}</p>
            </div>
          </div>
          <div className="mt-auto border-t border-border pt-4">
            <p className="text-sm leading-6 text-muted-foreground">{action.helper}</p>
          </div>
        </div>
      </SectionCard>
    );
  }

  const handleConfirm = async () => {
    if (!onStatusChange) return;
    setPending(true);
    setError(null);
    try {
      await onStatusChange(action.targetStatus);
      setOpen(false);
    } catch {
      setError(detail.accountStatus === "ACTIVE" ? "Status murid tidak dapat dikemas kini. Sila cuba lagi." : "Status murid tidak dapat dikemas kini. Sila cuba lagi.");
    } finally {
      setPending(false);
    }
  };

  return (
    <>
      <SectionCard icon={<ShieldCheck className="size-6" aria-hidden="true" />} iconClassName={detail.accountStatus === "SUSPENDED" ? "bg-slate-100 text-slate-700 dark:bg-slate-400/10 dark:text-slate-300" : "bg-emerald-100 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300"} title="Kawalan Akaun" className="h-full">
        <div className="flex h-full flex-col">
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4 rounded-xl border border-border bg-background/40 p-3">
              <span className="text-sm font-medium text-muted-foreground">Status Akaun</span>
              <AdminAccountStatusBadge status={detail.accountStatus} />
            </div>
            <div className="rounded-xl border border-border bg-background/40 p-3">
              <h3 className="text-base font-semibold text-foreground">{action.label === "Gantung Akaun" ? "Aktif" : "Digantung"}</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{action.description}</p>
            </div>
          </div>

          <div className="mt-auto border-t border-border pt-4">
            <p className="text-sm leading-6 text-muted-foreground">{action.helper}</p>
            <Button
              type="button"
              variant={detail.accountStatus === "ACTIVE" ? "outline" : "default"}
              className={cn(
                "mt-3 h-11 w-full gap-2 rounded-xl px-6 font-semibold shadow-sm disabled:opacity-60",
                detail.accountStatus === "ACTIVE"
                  ? "border border-amber-500/60 bg-amber-500/5 text-amber-400 hover:bg-amber-500/10 hover:text-amber-300 focus-visible:ring-2 focus-visible:ring-amber-500/30"
                  : "bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:ring-primary/30",
              )}
              disabled={pending || !onStatusChange}
              onClick={() => setOpen(true)}
            >
              {detail.accountStatus === "ACTIVE" ? <TriangleAlert className="size-4" aria-hidden="true" /> : <CircleCheck className="size-4" aria-hidden="true" />}
              {pending ? "Mengemas kini..." : action.actionLabel}
            </Button>
            {error ? <p className="mt-3 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive" role="alert">{error}</p> : null}
          </div>
        </div>
      </SectionCard>

      <AlertDialog open={open} onOpenChange={(nextOpen) => !pending && setOpen(nextOpen)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{detail.accountStatus === "ACTIVE" ? "Gantung akaun murid?" : "Aktifkan semula akaun murid?"}</AlertDialogTitle>
            <AlertDialogDescription>
              {detail.accountStatus === "ACTIVE"
                ? "Murid tidak akan dapat log masuk buat sementara waktu. Rekod kelas, aktiviti, penilaian dan kemajuan tidak akan dipadam."
                : "Murid akan dapat menggunakan semula ID Murid dan PIN untuk log masuk."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-11 rounded-xl px-5" disabled={pending}>Batal</AlertDialogCancel>
            <Button type="button" className={cn("h-11 gap-2 rounded-xl px-5 font-semibold", detail.accountStatus === "ACTIVE" ? "border border-amber-500/60 bg-amber-500/5 text-amber-400 hover:bg-amber-500/10 hover:text-amber-300 focus-visible:ring-2 focus-visible:ring-amber-500/30" : "bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:ring-primary/30")} disabled={pending || !onStatusChange} onClick={() => void handleConfirm()}>
              {detail.accountStatus === "ACTIVE" ? <TriangleAlert className="size-4" aria-hidden="true" /> : <CircleCheck className="size-4" aria-hidden="true" />}
              {pending ? "Memproses..." : action.actionLabel}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function StudentDangerZone({
  detail,
  onArchive,
}: {
  detail: TeacherStudentDetail;
  onArchive?: () => Promise<void>;
}) {
  const [open, setOpen] = React.useState(false);
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  if (detail.accountStatus === "ARCHIVED") {
    return (
      <section className="rounded-2xl border border-destructive/35 bg-destructive/5 p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
              <UserRoundX className="size-6" aria-hidden="true" />
            </div>
            <div className="space-y-1">
              <h2 className="text-lg font-semibold leading-none text-foreground">Zon Bahaya</h2>
              <p className="text-sm leading-6 text-muted-foreground">Akaun murid telah diarkibkan dan tidak mempunyai tindakan arkib tambahan.</p>
            </div>
          </div>
        </div>
      </section>
    );
  }

  const handleConfirm = async () => {
    if (!onArchive) return;
    setPending(true);
    setError(null);
    try {
      await onArchive();
      setOpen(false);
    } catch {
      setError("Status murid tidak dapat dikemas kini. Sila cuba lagi.");
    } finally {
      setPending(false);
    }
  };

  return (
    <>
      <section className="rounded-2xl border border-destructive/35 bg-destructive/5 p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
              <TriangleAlert className="size-6" aria-hidden="true" />
            </div>
            <div className="space-y-1">
              <h2 className="text-lg font-semibold leading-none text-foreground">Zon Bahaya</h2>
              <p className="text-sm leading-6 text-muted-foreground">Mengarkibkan murid akan menyahaktifkan akses murid dan menyimpan semua rekod berkaitan untuk tujuan audit.</p>
              <p className="text-sm leading-6 text-muted-foreground">Rekod kelas, aktiviti, penilaian dan kemajuan tidak akan dipadam.</p>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            className={cn("h-11 w-full gap-2 rounded-xl px-6 font-semibold shadow-sm sm:w-auto", "border border-destructive/40 text-destructive hover:bg-destructive/10 focus-visible:ring-destructive/30")}
            disabled={pending || !onArchive}
            onClick={() => setOpen(true)}
          >
            <Archive className="size-4" aria-hidden="true" />
            {pending ? "Mengarkibkan..." : "Arkibkan Murid"}
          </Button>
        </div>
        {error ? <p className="mt-3 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive" role="alert">{error}</p> : null}
      </section>

      <AlertDialog open={open} onOpenChange={(nextOpen) => !pending && setOpen(nextOpen)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Arkibkan murid?</AlertDialogTitle>
            <AlertDialogDescription>Murid tidak lagi boleh log masuk. Semua rekod kelas, aktiviti, penilaian dan kemajuan akan disimpan untuk tujuan audit.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-11 rounded-xl px-5" disabled={pending}>Batal</AlertDialogCancel>
            <Button type="button" variant="destructive" className="h-11 rounded-xl px-5 font-semibold" disabled={pending || !onArchive} onClick={() => void handleConfirm()}>
              <Archive className="size-4" aria-hidden="true" />
              {pending ? "Memproses..." : "Arkibkan Murid"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export function TeacherDetailSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Memuatkan butiran murid">
      <section className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <div className="size-16 rounded-2xl bg-muted/30" />
            <div className="space-y-3">
              <div className="h-7 w-64 rounded bg-muted/40" />
              <div className="h-4 w-24 rounded bg-muted/40" />
              <div className="h-4 w-20 rounded bg-muted/40" />
            </div>
          </div>
          <div className="space-y-2">
            <div className="h-8 w-28 rounded bg-muted/40" />
            <div className="h-4 w-44 rounded bg-muted/40" />
          </div>
        </div>
      </section>
      <div className="grid items-stretch gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="h-72 rounded-2xl bg-muted/30" />
        <div className="h-72 rounded-2xl bg-muted/30" />
      </div>
      <div className="grid items-stretch gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="h-72 rounded-2xl bg-muted/30" />
        <div className="h-72 rounded-2xl bg-muted/30" />
      </div>
      <div className="h-36 rounded-2xl bg-muted/30" />
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
          <Link to={path}>Kembali ke Senarai Murid</Link>
        </Button>
      </div>
    </section>
  );
}

export function TeacherStudentDetailView({
  detail,
  onStatusChange,
  onResetPin,
  onCopyLoginInfo,
}: {
  detail: TeacherStudentDetail;
  onStatusChange?: (status: "ACTIVE" | "SUSPENDED" | "ARCHIVED") => Promise<void>;
  onResetPin?: () => Promise<TeacherStudentPinResetResult>;
  onCopyLoginInfo?: (text: string) => Promise<void> | void;
}) {
  return (
    <div className="space-y-6">
      <StudentSummary detail={detail} />

      <div className="grid items-stretch gap-6 lg:grid-cols-2">
        <StudentInformationCard detail={detail} className="h-full" />
        <StudentAccountControlCard detail={detail} onStatusChange={onStatusChange} />
      </div>

      <div className="grid items-stretch gap-6 lg:grid-cols-2">
        <StudentLoginCard detail={detail} onResetPin={onResetPin} onCopyLoginInfo={onCopyLoginInfo} className="h-full" />
        <StudentParentCard detail={detail} className="h-full" />
      </div>

      <StudentSchoolCard detail={detail} />

      <StudentDangerZone
        detail={detail}
        onArchive={onStatusChange ? async () => {
          await onStatusChange("ARCHIVED");
        } : undefined}
      />
    </div>
  );
}
