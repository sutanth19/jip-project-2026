import type { ReactNode } from "react";
import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  ArrowLeft,
  Archive,
  BarChart3,
  CalendarDays,
  Clock3,
  CircleCheck,
  Eye,
  GraduationCap,
  LoaderCircle,
  Pencil,
  RotateCcw,
  School,
  ShieldCheck,
  Shapes,
  TriangleAlert,
  UsersRound,
} from "lucide-react";
import { Link, useParams } from "react-router-dom";

import { EmptyState, ManagementPageLayout } from "@/components/shared";
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
import { updateTeacherClassStatus } from "@/features/teacher/api/teacher-class.api";
import { teacherClassKeys, useTeacherClassDetail, useTeacherClassStudents } from "@/features/teacher/hooks/use-teacher-class-list";
import type { TeacherClassDetail, TeacherClassStudent } from "@/features/teacher/types/teacher-class.types";
import { teacherClassDisplayLabel, teacherClassStatusLabel, teacherClassYearLabel } from "@/features/teacher/utils/teacher-class";
import { parseApiError } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useToast } from "@/providers/toast-context-value";
import { formatDateTime } from "@/utils/date";

function formatClassDateTime(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Tidak tersedia" : formatDateTime(date);
}

function classInitials(detail: TeacherClassDetail): string {
  return `${detail.yearLevel}${detail.className.slice(0, 1)}`.toUpperCase();
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
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("flex h-full flex-col rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6", className)}>
      <div className="flex items-center gap-3">
        <div className={cn("flex size-12 shrink-0 items-center justify-center rounded-xl", iconClassName)}>
          {icon}
        </div>
        <h2 className="text-xl font-semibold leading-none text-foreground">{title}</h2>
      </div>
      <div className="mt-5 flex flex-1 flex-col">{children}</div>
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
  value: ReactNode;
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

function ClassSummaryCard({ detail }: { detail: TeacherClassDetail }) {
  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-center gap-4">
          <div className="flex size-[72px] shrink-0 items-center justify-center rounded-2xl bg-secondary/10 text-xl font-bold text-secondary ring-1 ring-secondary/20 lg:size-20">
            {classInitials(detail)}
          </div>
          <div className="min-w-0">
            <h2 className="break-words text-xl font-semibold text-foreground sm:text-2xl">{teacherClassDisplayLabel(detail)}</h2>
            <p className="mt-1 text-sm font-medium text-muted-foreground">{detail.className}</p>
            <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-2">
                <School className="size-4" aria-hidden="true" />
                Kelas Asal
              </span>
              <span>{teacherClassYearLabel(detail.yearLevel)}</span>
              <span>Sesi Akademik {detail.academicYear}</span>
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-3 lg:items-end lg:text-right">
          <AdminAccountStatusBadge status={detail.accountStatus} />
        </div>
      </div>
    </section>
  );
}

function ClassInformationCard({ detail }: { detail: TeacherClassDetail }) {
  return (
    <DetailCard
      icon={<Shapes className="size-6" aria-hidden="true" />}
      iconClassName="bg-blue-50 text-blue-600 dark:bg-blue-400/10 dark:text-blue-300"
      title="Maklumat Kelas"
    >
      <div className="grid gap-x-8 gap-y-6 md:grid-cols-2">
        <InformationRow icon={<Shapes className="size-4" aria-hidden="true" />} label="Nama Kelas" value={detail.className} />
        <InformationRow icon={<School className="size-4" aria-hidden="true" />} label="Tahun" value={teacherClassYearLabel(detail.yearLevel)} />
        <InformationRow icon={<CalendarDays className="size-4" aria-hidden="true" />} label="Sesi Akademik" value={detail.academicYear} />
        <InformationRow icon={<GraduationCap className="size-4" aria-hidden="true" />} label="Nama Paparan" value={teacherClassDisplayLabel(detail)} />
        <InformationRow icon={<CalendarDays className="size-4" aria-hidden="true" />} label="Tarikh Dicipta" value={formatClassDateTime(detail.createdAt)} />
        <InformationRow icon={<Clock3 className="size-4" aria-hidden="true" />} label="Terakhir Dikemas Kini" value={formatClassDateTime(detail.updatedAt)} />
      </div>
    </DetailCard>
  );
}

function StatisticRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex min-h-[72px] items-center justify-between rounded-xl border border-border bg-muted/20 px-5 py-3">
      <div className="flex items-center gap-4">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-violet-500/10 text-violet-500 dark:text-violet-300">
          <UsersRound className="size-5" aria-hidden="true" />
        </div>
        <span className="text-base font-medium text-muted-foreground">{label}</span>
      </div>
      <p className="text-2xl font-semibold tracking-tight text-foreground">{value}</p>
    </div>
  );
}

function ClassStatisticsCard({ detail }: { detail: TeacherClassDetail }) {
  return (
    <DetailCard
      icon={<BarChart3 className="size-6" aria-hidden="true" />}
      iconClassName="bg-violet-100 text-violet-700 dark:bg-violet-400/10 dark:text-violet-300"
      title="Statistik Kelas"
    >
      <div className="space-y-3">
        <StatisticRow label="Jumlah Murid" value={detail.studentCount} />
      </div>
    </DetailCard>
  );
}

function StudentListCard({
  students,
  isLoading,
}: {
  students: TeacherClassStudent[];
  isLoading: boolean;
}) {
  return (
    <DetailCard
      icon={<UsersRound className="size-6" aria-hidden="true" />}
      iconClassName="bg-emerald-100 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300"
      title="Senarai Murid"
    >
      {isLoading ? (
        <div className="space-y-3" aria-busy="true" aria-label="Memuatkan senarai murid">
          <Skeleton className="h-14 rounded-xl" />
          <Skeleton className="h-14 rounded-xl" />
        </div>
      ) : students.length > 0 ? (
        <div className="space-y-3">
          {students.map((student) => (
            <div key={student.id} className="flex flex-col gap-3 rounded-xl border border-border bg-muted/20 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="break-words text-base font-semibold text-foreground">{student.fullName}</p>
                <p className="mt-1 text-sm text-muted-foreground">{student.studentId || "ID murid tidak tersedia"}</p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <AdminAccountStatusBadge status={student.accountStatus} />
                <Button asChild size="sm" className="h-10 gap-2 rounded-lg px-4 font-semibold">
                  <Link to={`/guru/murid/${student.id}`} aria-label={`Lihat murid ${student.fullName}`}>
                    <Eye className="size-4" aria-hidden="true" />
                    Lihat
                  </Link>
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-muted/20 p-5">
          <h3 className="text-base font-semibold text-foreground">Belum ada murid didaftarkan dalam kelas ini.</h3>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Murid yang menggunakan kelas ini akan dipaparkan selepas pendaftaran murid dilengkapkan.
          </p>
        </div>
      )}
    </DetailCard>
  );
}

function ClassControlCard({
  detail,
  pending,
  error,
  onStatusChange,
}: {
  detail: TeacherClassDetail;
  pending: boolean;
  error: string | null;
  onStatusChange: (status: "ACTIVE" | "ARCHIVED") => Promise<void>;
}) {
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const isArchived = detail.accountStatus === "ARCHIVED";
  const isActive = detail.accountStatus === "ACTIVE";
  const targetStatus = isArchived ? "ACTIVE" : "ARCHIVED";
  const canChange = isArchived || isActive;
  const action = isArchived
    ? {
      label: "Aktifkan Semula",
      title: "Aktifkan semula kelas?",
      description: "Kelas ini akan tersedia semula untuk digunakan semasa pendaftaran murid.",
      helper: "Mengaktifkan semula kelas akan membolehkannya digunakan semula semasa pendaftaran murid.",
      icon: <RotateCcw className="size-4" aria-hidden="true" />,
      className: "bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:ring-primary/30",
    }
    : {
      label: "Arkibkan Kelas",
      title: "Arkibkan kelas?",
      description: "Kelas ini tidak lagi boleh dipilih untuk pendaftaran murid baharu. Rekod murid sedia ada tidak akan dipadam.",
      helper: "Mengarkibkan kelas akan menghalangnya daripada dipilih untuk pendaftaran murid baharu tanpa memadam rekod sedia ada.",
      icon: <Archive className="size-4" aria-hidden="true" />,
      className: "border border-amber-500/60 bg-amber-500/5 text-amber-500 hover:bg-amber-500/10 hover:text-amber-600 focus-visible:ring-2 focus-visible:ring-amber-500/30 dark:text-amber-400 dark:hover:text-amber-300",
    };

  const handleConfirm = async () => {
    await onStatusChange(targetStatus);
    setDialogOpen(false);
  };

  return (
    <>
      <DetailCard
        icon={<ShieldCheck className="size-6" aria-hidden="true" />}
        iconClassName={isArchived ? "bg-slate-100 text-slate-700 dark:bg-slate-400/10 dark:text-slate-300" : "bg-emerald-100 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300"}
        title="Kawalan Kelas"
      >
        <div className="flex h-full flex-col">
          <div className="space-y-5">
            <div className="flex items-center justify-between gap-4 rounded-xl border border-border bg-muted/20 p-4">
              <span className="text-sm font-medium text-muted-foreground">Status</span>
              <AdminAccountStatusBadge status={detail.accountStatus} />
            </div>
            <div>
              <h3 className="text-base font-semibold text-foreground">{teacherClassStatusLabel(detail.accountStatus)}</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {isArchived
                  ? "Kelas ini tidak boleh dipilih semasa pendaftaran murid baharu."
                  : "Kelas ini sedang aktif dan boleh digunakan semasa pendaftaran murid."}
              </p>
            </div>
          </div>

          <div className="mt-auto space-y-3 pt-6">
            {canChange ? (
              <>
                <p className="text-sm leading-6 text-muted-foreground">{action.helper}</p>
                <Button
                  type="button"
                  className={cn("h-12 w-full gap-2 rounded-xl px-6 font-semibold shadow-sm disabled:opacity-60", action.className)}
                  disabled={pending}
                  onClick={() => setDialogOpen(true)}
                >
                  {pending ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : action.icon}
                  {pending ? "Mengemas kini..." : action.label}
                </Button>
              </>
            ) : (
              <div className="rounded-xl border border-border bg-muted/20 p-4">
                <p className="text-sm font-semibold text-foreground">Status ini tidak mempunyai tindakan tersedia.</p>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">Hanya kelas aktif atau diarkibkan boleh dikemas kini oleh guru.</p>
              </div>
            )}
            {error ? <p className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive" role="alert">{error}</p> : null}
          </div>
        </div>
      </DetailCard>

      <AlertDialog open={dialogOpen} onOpenChange={(open) => !pending && setDialogOpen(open)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              {isArchived ? <CircleCheck className="size-5 text-primary" aria-hidden="true" /> : <TriangleAlert className="size-5 text-amber-500" aria-hidden="true" />}
              {action.title}
            </AlertDialogTitle>
            <AlertDialogDescription>{action.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-11 rounded-xl px-5" disabled={pending}>Batal</AlertDialogCancel>
            <Button type="button" className={cn("h-11 gap-2 rounded-xl px-5 font-semibold", action.className)} disabled={pending} onClick={() => void handleConfirm()}>
              {pending ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : action.icon}
              {pending ? "Mengemas kini..." : action.label}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function DetailSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Memuatkan butiran kelas">
      <Skeleton className="h-32 rounded-2xl" />
      <div className="grid items-stretch gap-6 lg:grid-cols-[2fr_1fr]">
        <Skeleton className="h-72 rounded-2xl" />
        <Skeleton className="h-72 rounded-2xl" />
      </div>
      <div className="grid items-stretch gap-6 lg:grid-cols-[2fr_1fr]">
        <Skeleton className="h-72 rounded-2xl" />
        <Skeleton className="h-72 rounded-2xl" />
      </div>
    </div>
  );
}

function ClassDetailErrorState({
  title,
  description,
  onRetry,
}: {
  title: string;
  description: string;
  onRetry: () => void;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6 text-center shadow-sm">
      <AlertCircle className="mx-auto size-8 text-destructive" aria-hidden="true" />
      <h2 className="mt-3 text-base font-semibold text-foreground">{title}</h2>
      <p className="mx-auto mt-1 max-w-xl text-sm leading-6 text-muted-foreground">{description}</p>
      <div className="mt-5 flex flex-col justify-center gap-3 sm:flex-row">
        <Button type="button" onClick={onRetry}>
          Cuba Semula
        </Button>
        <Button asChild variant="outline">
          <Link to="/guru/kelas">Kembali ke Kelas</Link>
        </Button>
      </div>
    </div>
  );
}

export function TeacherClassDetailPage() {
  const { classId = "" } = useParams();
  const toast = useToast();
  const queryClient = useQueryClient();
  const detailQuery = useTeacherClassDetail(classId);
  const detail = detailQuery.data?.class ?? null;
  const studentsQuery = useTeacherClassStudents(classId, Boolean(detail));
  const parsedError = detailQuery.error ? parseApiError(detailQuery.error) : null;
  const safeNotFound = parsedError?.status === 403 || parsedError?.status === 404 || parsedError?.status === 400;
  const [statusError, setStatusError] = React.useState<string | null>(null);
  const statusMutation = useMutation({
    mutationFn: (status: "ACTIVE" | "ARCHIVED") => updateTeacherClassStatus(classId, status),
    onSuccess: async (_result, status) => {
      setStatusError(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: teacherClassKeys.all }),
        queryClient.invalidateQueries({ queryKey: teacherClassKeys.detail(classId) }),
      ]);
      toast.success(status === "ARCHIVED" ? "Kelas berjaya diarkibkan." : "Kelas berjaya diaktifkan semula.");
    },
    onError: (error) => {
      const parsed = parseApiError(error);
      setStatusError(parsed.message || "Status kelas tidak dapat dikemas kini. Sila cuba lagi.");
    },
  });

  return (
    <ManagementPageLayout
      breadcrumb={[
        { label: "Guru", to: "/guru" },
        { label: "Kelas", to: "/guru/kelas" },
        { label: "Butiran Kelas" },
      ]}
      title="Butiran Kelas"
      description="Lihat dan urus maklumat kelas asal murid."
      actions={
        <>
          <Button asChild variant="outline" className="h-11 w-full gap-2 rounded-xl px-5 focus-visible:ring-primary/30 sm:w-auto">
            <Link to="/guru/kelas">
              <ArrowLeft className="size-4" aria-hidden="true" />
              Kembali
            </Link>
          </Button>
          <Button asChild className="h-11 w-full gap-2 rounded-xl bg-primary px-5 font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 focus-visible:ring-primary/30 sm:w-auto">
            <Link to={`/guru/kelas/${classId}/edit`} aria-label="Edit Kelas">
              <Pencil className="size-4" aria-hidden="true" />
              Edit Kelas
            </Link>
          </Button>
        </>
      }
    >
      {detailQuery.isLoading ? <DetailSkeleton /> : null}

      {detailQuery.isError ? (
        <ClassDetailErrorState
          title={safeNotFound ? "Kelas tidak ditemui" : "Butiran kelas tidak dapat dimuatkan"}
          description={
            safeNotFound
              ? "Kelas tidak ditemui atau anda tidak mempunyai kebenaran untuk melihat rekod ini."
              : "Sila cuba semula. Jika masalah berterusan, hubungi pentadbir sistem."
          }
          onRetry={() => void detailQuery.refetch()}
        />
      ) : null}

      {!detailQuery.isLoading && !detailQuery.isError && !detail ? (
        <EmptyState
          title="Kelas tidak ditemui"
          description="Kelas tidak ditemui atau anda tidak mempunyai kebenaran untuk melihat rekod ini."
          action={
            <Button asChild variant="outline">
              <Link to="/guru/kelas">Kembali ke Kelas</Link>
            </Button>
          }
        />
      ) : null}

      {detail ? (
        <div className="space-y-6">
          <ClassSummaryCard detail={detail} />

          <div className="grid items-stretch gap-6 lg:grid-cols-[2fr_1fr]">
            <ClassInformationCard detail={detail} />
            <ClassStatisticsCard detail={detail} />
          </div>

          <div className="grid items-stretch gap-6 lg:grid-cols-[2fr_1fr]">
            <StudentListCard students={studentsQuery.data?.students ?? []} isLoading={studentsQuery.isLoading} />
            <ClassControlCard
              detail={detail}
              pending={statusMutation.isPending}
              error={statusError}
              onStatusChange={async (status) => {
                await statusMutation.mutateAsync(status);
              }}
            />
          </div>
        </div>
      ) : null}
    </ManagementPageLayout>
  );
}
