import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Pencil } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

import { ManagementPageLayout } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { resetTeacherStudentPin, updateTeacherStudentStatus } from "@/features/teacher/api/teacher-student.api";
import { TeacherStudentDetailView } from "@/features/teacher/components/TeacherStudentDetailView";
import { TeacherStudentNoSchoolState } from "@/features/teacher/components/TeacherStudentList";
import { teacherStudentDetailKeys, useTeacherStudentDetail } from "@/features/teacher/hooks/use-teacher-student-detail";
import { teacherStudentKeys } from "@/features/teacher/hooks/use-teacher-student-list";
import { parseApiError } from "@/lib/api";
import { useToast } from "@/providers/toast-context-value";
import { useAuthStore } from "@/stores/auth-store";

function TeacherStudentDetailSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Memuatkan butiran murid">
      <Skeleton className="h-32 rounded-2xl" />
      <div className="grid items-stretch gap-6 lg:grid-cols-2">
        <Skeleton className="h-72 rounded-2xl" />
        <Skeleton className="h-72 rounded-2xl" />
      </div>
      <div className="grid items-stretch gap-6 lg:grid-cols-2">
        <Skeleton className="h-72 rounded-2xl" />
        <Skeleton className="h-72 rounded-2xl" />
      </div>
      <Skeleton className="h-44 rounded-2xl" />
      <Skeleton className="h-36 rounded-2xl" />
    </div>
  );
}

function TeacherStudentDetailError({ title, description, onRetry }: { title: string; description: string; onRetry: () => void }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6 text-center shadow-sm">
      <h2 className="text-base font-semibold text-foreground">{title}</h2>
      <p className="mx-auto mt-1 max-w-xl text-sm leading-6 text-muted-foreground">{description}</p>
      <div className="mt-5 flex flex-col justify-center gap-3 sm:flex-row">
        <Button type="button" onClick={onRetry}>Cuba Semula</Button>
        <Button asChild variant="outline">
          <Link to="/guru/murid">Kembali ke Murid</Link>
        </Button>
      </div>
    </div>
  );
}

export function TeacherStudentDetailPage() {
  const { studentId = "" } = useParams();
  const school = useAuthStore((state) => state.school);
  const queryClient = useQueryClient();
  const toast = useToast();
  const detailQuery = useTeacherStudentDetail(studentId, Boolean(school?.id));
  const detail = detailQuery.data?.student ?? null;
  const parsedError = detailQuery.error ? parseApiError(detailQuery.error) : null;
  const safeNotFound = parsedError?.status === 403 || parsedError?.status === 404 || parsedError?.status === 400;
  const refreshDetail = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: teacherStudentKeys.all }),
      queryClient.invalidateQueries({ queryKey: teacherStudentDetailKeys.detail(studentId) }),
    ]);
  };

  return (
    <ManagementPageLayout
      breadcrumb={[
        { label: "Guru", to: "/guru" },
        { label: "Murid", to: "/guru/murid" },
        { label: "Butiran Murid" },
      ]}
      title="Butiran Murid"
      description="Lihat dan urus maklumat murid Program Pemulihan Khas."
      currentAccent="secondary"
      actions={detail ? (
        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
          <Button asChild variant="outline" className="h-11 w-full gap-2 rounded-xl px-5 focus-visible:ring-primary/30 sm:w-auto">
            <Link to="/guru/murid"><ArrowLeft className="size-4" aria-hidden="true" />Kembali</Link>
          </Button>
          <Button asChild className="h-11 w-full gap-2 rounded-xl bg-primary px-5 font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 focus-visible:ring-primary/30 sm:w-auto">
            <Link to={`/guru/murid/${detail.id}/edit`}>
              <Pencil className="size-4" aria-hidden="true" />
              Edit Murid
            </Link>
          </Button>
        </div>
      ) : null}
    >
      {!school?.id ? <TeacherStudentNoSchoolState /> : null}
      {school?.id && detailQuery.isLoading ? <TeacherStudentDetailSkeleton /> : null}
      {school?.id && detailQuery.isError ? (
        <TeacherStudentDetailError
          title={safeNotFound ? "Murid tidak ditemui" : "Butiran murid tidak dapat dimuatkan."}
          description={safeNotFound ? "Rekod murid tidak ditemui atau anda tidak mempunyai kebenaran untuk melihat rekod ini." : "Sila cuba lagi. Jika masalah berterusan, hubungi pentadbir sistem."}
          onRetry={() => void detailQuery.refetch()}
        />
      ) : null}
      {school?.id && !detailQuery.isLoading && !detailQuery.isError && detail ? (
        <TeacherStudentDetailView
          detail={detail}
          onStatusChange={async (status) => {
            await updateTeacherStudentStatus(studentId, { status });
            await refreshDetail();
            toast.success(status === "ARCHIVED" ? "Murid berjaya diarkibkan." : status === "SUSPENDED" ? "Akaun murid berjaya digantung." : "Akaun murid berjaya diaktifkan semula.");
          }}
          onResetPin={async () => {
            const result = await resetTeacherStudentPin(studentId);
            await refreshDetail();
            toast.success("PIN murid berjaya ditetapkan semula.");
            return result;
          }}
          onCopyLoginInfo={async (text) => {
            await navigator.clipboard.writeText(text);
            toast.success("Maklumat log masuk telah disalin.");
          }}
        />
      ) : null}
    </ManagementPageLayout>
  );
}
