import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { ManagementPageLayout } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { updateTeacherStudent } from "@/features/teacher/api/teacher-student.api";
import { TeacherStudentEditForm } from "@/features/teacher/components/TeacherStudentEditForm";
import { TeacherStudentNoSchoolState } from "@/features/teacher/components/TeacherStudentList";
import { useTeacherClassList } from "@/features/teacher/hooks/use-teacher-class-list";
import { teacherStudentDetailKeys, useTeacherStudentDetail } from "@/features/teacher/hooks/use-teacher-student-detail";
import { teacherStudentKeys } from "@/features/teacher/hooks/use-teacher-student-list";
import type { TeacherStudentUpdatePayload } from "@/features/teacher/types/teacher-student.types";
import { defaultTeacherClassQuery } from "@/features/teacher/utils/teacher-class";
import { mapTeacherStudentEditSubmissionError } from "@/features/teacher/utils/teacher-student-edit";
import { parseApiError } from "@/lib/api";
import { useToast } from "@/providers/toast-context-value";
import { useAuthStore } from "@/stores/auth-store";

function TeacherStudentEditSkeleton() {
  return (
    <div className="w-full overflow-hidden rounded-2xl border border-border bg-card shadow-sm" aria-busy="true" aria-label="Memuatkan borang edit murid">
      <div className="p-5 sm:p-6">
        <div className="mx-auto flex w-full max-w-5xl items-center gap-4">
          <Skeleton className="size-14 rounded-2xl" />
          <div className="w-full max-w-md space-y-2">
            <Skeleton className="h-6 w-44" />
            <Skeleton className="h-4 w-full" />
          </div>
        </div>
      </div>
      <div className="border-t border-border p-5 sm:p-6">
        <div className="mx-auto w-full max-w-5xl space-y-6">
          <Skeleton className="h-12 rounded-xl" />
          <Skeleton className="h-12 rounded-xl" />
          <Skeleton className="h-12 rounded-xl" />
        </div>
      </div>
    </div>
  );
}

function TeacherStudentEditError({ title, description, onRetry }: { title: string; description: string; onRetry: () => void }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6 text-center shadow-sm">
      <h2 className="text-base font-semibold text-foreground">{title}</h2>
      <p className="mx-auto mt-1 max-w-xl text-sm leading-6 text-muted-foreground">{description}</p>
      <div className="mt-5 flex flex-col justify-center gap-3 sm:flex-row">
        <Button type="button" onClick={onRetry}>Cuba Semula</Button>
        <Button asChild variant="outline"><Link to="/guru/murid">Kembali ke Murid</Link></Button>
      </div>
    </div>
  );
}

export function TeacherStudentEditPage() {
  const { studentId = "" } = useParams();
  const school = useAuthStore((state) => state.school);
  const navigate = useNavigate();
  const toast = useToast();
  const queryClient = useQueryClient();
  const detailQuery = useTeacherStudentDetail(studentId, Boolean(school?.id));
  const detail = detailQuery.data?.student ?? null;
  const classQuery = useTeacherClassList({ page: 1, limit: 100, status: "ACTIVE", sortBy: defaultTeacherClassQuery.sortBy, sortOrder: defaultTeacherClassQuery.sortOrder }, Boolean(school?.id));
  const parsedError = detailQuery.error ? parseApiError(detailQuery.error) : null;
  const safeNotFound = parsedError?.status === 403 || parsedError?.status === 404 || parsedError?.status === 400;
  const updateMutation = useMutation({
    mutationFn: (payload: TeacherStudentUpdatePayload) => updateTeacherStudent(studentId, payload),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: teacherStudentKeys.all }),
        queryClient.invalidateQueries({ queryKey: teacherStudentDetailKeys.detail(studentId) }),
      ]);
      toast.success("Maklumat murid berjaya dikemas kini.");
      navigate(`/guru/murid/${studentId}`, { replace: true });
    },
    onError: (error) => {
      const mapped = mapTeacherStudentEditSubmissionError(error);
      toast.error("Maklumat murid tidak dapat dikemas kini", mapped.message);
    },
  });

  return (
    <ManagementPageLayout
      breadcrumb={[
        { label: "Guru", to: "/guru" },
        { label: "Murid", to: "/guru/murid" },
        { label: "Edit Murid" },
      ]}
      title="Edit Murid"
      description="Kemas kini maklumat murid dan penempatan kelas asal."
      currentAccent="secondary"
      actions={detail ? (
        <Button asChild variant="outline" className="h-11 w-full gap-2 rounded-xl px-5 focus-visible:ring-secondary/30 sm:w-auto">
          <Link to={`/guru/murid/${detail.id}`}>
            <ArrowLeft className="size-4" aria-hidden="true" />
            Kembali
          </Link>
        </Button>
      ) : null}
    >
      {!school?.id ? <TeacherStudentNoSchoolState /> : null}
      {school?.id && (detailQuery.isLoading || classQuery.isLoading) ? <TeacherStudentEditSkeleton /> : null}
      {school?.id && detailQuery.isError ? (
        <TeacherStudentEditError
          title={safeNotFound ? "Murid tidak ditemui" : "Maklumat murid tidak dapat dimuatkan."}
          description={safeNotFound ? "Rekod murid tidak ditemui atau anda tidak mempunyai kebenaran untuk mengubahnya." : "Sila cuba lagi. Jika masalah berterusan, hubungi pentadbir sistem."}
          onRetry={() => void detailQuery.refetch()}
        />
      ) : null}
      {school?.id && !detailQuery.isLoading && !detailQuery.isError && detail ? (
        <TeacherStudentEditForm
          detail={detail}
          classes={classQuery.data?.classes ?? []}
          classesLoading={classQuery.isLoading}
          classesError={classQuery.isError}
          onRetryClasses={() => void classQuery.refetch()}
          submitting={updateMutation.isPending}
          onSubmit={async (payload) => {
            await updateMutation.mutateAsync(payload);
          }}
        />
      ) : null}
    </ManagementPageLayout>
  );
}
