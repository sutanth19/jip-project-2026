import { AlertCircle, ArrowLeft } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router-dom";

import { ManagementPageLayout } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { updateTeacherClass } from "@/features/teacher/api/teacher-class.api";
import { TeacherClassEditForm } from "@/features/teacher/components/TeacherClassEditForm";
import { teacherClassKeys, useTeacherClassDetail } from "@/features/teacher/hooks/use-teacher-class-list";
import type { TeacherClassCreatePayload } from "@/features/teacher/utils/teacher-class-create";
import { parseApiError } from "@/lib/api";
import { useToast } from "@/providers/toast-context-value";

function TeacherClassEditLoading() {
  return (
    <div className="w-full overflow-hidden rounded-2xl border border-border bg-card shadow-sm" aria-busy="true" aria-label="Memuatkan borang edit kelas">
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

function TeacherClassEditError({
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
        <Button type="button" onClick={onRetry}>Cuba Semula</Button>
        <Button asChild variant="outline">
          <Link to="/guru/kelas">Kembali ke Kelas</Link>
        </Button>
      </div>
    </div>
  );
}

export function TeacherClassEditPage() {
  const { classId = "" } = useParams();
  const detailPath = `/guru/kelas/${classId}`;
  const navigate = useNavigate();
  const toast = useToast();
  const queryClient = useQueryClient();
  const detailQuery = useTeacherClassDetail(classId);
  const detail = detailQuery.data?.class ?? null;
  const parsedError = detailQuery.error ? parseApiError(detailQuery.error) : null;
  const safeNotFound = parsedError?.status === 403 || parsedError?.status === 404 || parsedError?.status === 400;
  const updateMutation = useMutation({
    mutationFn: (payload: TeacherClassCreatePayload) => updateTeacherClass(classId, payload),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: teacherClassKeys.all }),
        queryClient.invalidateQueries({ queryKey: teacherClassKeys.detail(classId) }),
      ]);
      toast.success("Maklumat kelas berjaya dikemas kini.");
      navigate(detailPath, { replace: true });
    },
  });

  return (
    <ManagementPageLayout
      breadcrumb={[
        { label: "Guru", to: "/guru" },
        { label: "Kelas", to: "/guru/kelas" },
        { label: "Edit Kelas" },
      ]}
      title="Edit Kelas"
      description="Kemas kini maklumat kelas asal murid."
      actions={
        <Button asChild variant="outline" className="h-11 w-full gap-2 rounded-xl px-5 focus-visible:ring-primary/30 sm:w-auto">
          <Link to={detailPath}>
            <ArrowLeft className="size-4" aria-hidden="true" />
            Kembali
          </Link>
        </Button>
      }
    >
      {detailQuery.isLoading ? <TeacherClassEditLoading /> : null}

      {detailQuery.isError ? (
        <TeacherClassEditError
          title={safeNotFound ? "Kelas tidak ditemui" : "Maklumat kelas tidak dapat dimuatkan."}
          description={
            safeNotFound
              ? "Kelas tidak ditemui atau anda tidak mempunyai kebenaran untuk mengurus rekod ini."
              : "Sila cuba semula. Jika masalah berterusan, hubungi pentadbir sistem."
          }
          onRetry={() => void detailQuery.refetch()}
        />
      ) : null}

      {detail ? (
        <TeacherClassEditForm
          detail={detail}
          detailPath={detailPath}
          submitting={updateMutation.isPending}
          onSubmit={async (payload) => {
            await updateMutation.mutateAsync(payload);
          }}
        />
      ) : null}
    </ManagementPageLayout>
  );
}
