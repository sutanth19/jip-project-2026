import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Pencil } from "lucide-react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import * as React from "react";

import { ManagementPageLayout } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { updateTeacherParent, updateTeacherParentStatus, resendTeacherParentSetup, createTeacherParent } from "@/features/teacher/api/teacher-parent.api";
import { TeacherParentDetailView } from "@/features/teacher/components/TeacherParentDetailView";
import {
  AddParentButton,
  TeacherParentEmptyState,
  TeacherParentErrorState,
  TeacherParentFilteredEmptyState,
  TeacherParentListFilters,
  TeacherParentListLoading,
  TeacherParentListTable,
  TeacherParentMobileCards,
  TeacherParentNoSchoolState,
  TeacherParentPagination,
} from "@/features/teacher/components/TeacherParentList";
import { TeacherParentForm } from "@/features/teacher/components/TeacherParentForm";
import { useTeacherParentDetail } from "@/features/teacher/hooks/use-teacher-parent-detail";
import { teacherParentKeys, useTeacherParentList } from "@/features/teacher/hooks/use-teacher-parent-list";
import { useTeacherStudentList } from "@/features/teacher/hooks/use-teacher-student-list";
import type { TeacherStudentListItem } from "@/features/teacher/types/teacher-student.types";
import type { TeacherParentDetail, TeacherParentListQuery, TeacherParentStatusUpdatePayload } from "@/features/teacher/types/teacher-parent.types";
import { defaultTeacherParentQuery, teacherParentListQueryToSearchParams } from "@/features/teacher/utils/teacher-parent";
import { parseApiError } from "@/lib/api";
import { useToast } from "@/providers/toast-context-value";
import { useAuthStore } from "@/stores/auth-store";

function numberParam(value: string | null): number | undefined {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function searchParamsToQuery(searchParams: URLSearchParams): Partial<TeacherParentListQuery> {
  return {
    page: numberParam(searchParams.get("page")) ?? defaultTeacherParentQuery.page,
    limit: numberParam(searchParams.get("limit")) ?? defaultTeacherParentQuery.limit,
    search: searchParams.get("search") ?? undefined,
    status: (searchParams.get("status") as TeacherParentListQuery["status"] | null) ?? undefined,
    relationship: (searchParams.get("relationship") as TeacherParentListQuery["relationship"] | null) ?? undefined,
    sortBy: (searchParams.get("sortBy") as TeacherParentListQuery["sortBy"] | null) ?? defaultTeacherParentQuery.sortBy,
    sortOrder: (searchParams.get("sortOrder") as TeacherParentListQuery["sortOrder"] | null) ?? defaultTeacherParentQuery.sortOrder,
  };
}

function queryToSearchParams(query: Partial<TeacherParentListQuery>) {
  return teacherParentListQueryToSearchParams(query);
}

function TeacherParentListSkeleton() {
  return <TeacherParentListLoading />;
}

function TeacherParentDetailSkeleton() {
  return (
    <div className="w-full overflow-hidden rounded-2xl border border-border bg-card shadow-sm" aria-busy="true" aria-label="Memuatkan butiran ibu bapa">
      <div className="p-5 sm:p-6">
        <div className="mx-auto flex w-full max-w-5xl items-center gap-4">
          <Skeleton className="size-[72px] rounded-2xl" />
          <div className="w-full max-w-md space-y-2">
            <Skeleton className="h-6 w-44" />
            <Skeleton className="h-4 w-full" />
          </div>
        </div>
      </div>
      <div className="border-t border-border p-5 sm:p-6">
        <div className="mx-auto w-full max-w-5xl space-y-6">
          <Skeleton className="h-32 rounded-2xl" />
          <Skeleton className="h-40 rounded-2xl" />
        </div>
      </div>
    </div>
  );
}

function toStudentListItems(detail: TeacherParentDetail | null): TeacherStudentListItem[] {
  if (!detail) return [];
  return detail.students.map((entry) => ({
    id: entry.student.id,
    userId: entry.student.id,
    schoolId: "",
    classId: entry.student.class.id,
    studentId: entry.student.studentId,
    fullName: entry.student.fullName,
    avatar: entry.student.avatar,
    accountStatus: "ACTIVE",
    remedialLevel: null,
    createdAt: detail.createdAt,
    updatedAt: detail.updatedAt,
    class: entry.student.class,
  }));
}

export function TeacherParentListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const school = useAuthStore((state) => state.school);
  const query = React.useMemo(() => searchParamsToQuery(searchParams), [searchParams]);
  const parentList = useTeacherParentList(query, Boolean(school?.id));
  const hasFilters = Boolean(query.search?.trim() || query.status || query.relationship);
  const canCreate = Boolean(school?.id);

  const updateQuery = React.useCallback((patch: Partial<TeacherParentListQuery>) => {
    const nextQuery = {
      ...query,
      ...patch,
    };
    setSearchParams(queryToSearchParams(nextQuery), { replace: true });
  }, [query, setSearchParams]);

  return (
    <ManagementPageLayout
      title="Ibu Bapa"
      description="Urus ibu bapa dan penjaga bagi murid sekolah anda."
      currentAccent="secondary"
      actions={canCreate ? <AddParentButton /> : null}
    >
      <TeacherParentListFilters query={query} onChange={updateQuery} />
      {!school?.id ? <div className="mt-6"><TeacherParentNoSchoolState /></div> : null}
      {school?.id && parentList.isLoading ? <TeacherParentListSkeleton /> : null}
      {school?.id && parentList.isError ? <div className="mt-6"><TeacherParentErrorState onRetry={() => void parentList.refetch()} /></div> : null}
      {school?.id && !parentList.isLoading && !parentList.isError && parentList.data?.parents.length === 0 && !hasFilters ? (
        <div className="mt-6"><TeacherParentEmptyState canCreate={canCreate} /></div>
      ) : null}
      {school?.id && !parentList.isLoading && !parentList.isError && parentList.data?.parents.length === 0 && hasFilters ? (
        <div className="mt-6"><TeacherParentFilteredEmptyState onReset={() => updateQuery({ search: undefined, status: undefined, relationship: undefined, page: 1 })} /></div>
      ) : null}
      {school?.id && !parentList.isLoading && !parentList.isError && (parentList.data?.parents.length ?? 0) > 0 ? (
        <>
          <TeacherParentListTable rows={parentList.data?.parents ?? []} />
          <TeacherParentMobileCards rows={parentList.data?.parents ?? []} />
          <TeacherParentPagination
            page={parentList.data?.pagination.page ?? query.page ?? defaultTeacherParentQuery.page}
            limit={parentList.data?.pagination.limit ?? query.limit ?? defaultTeacherParentQuery.limit}
            total={parentList.data?.pagination.total ?? 0}
            totalPages={parentList.data?.pagination.totalPages ?? 0}
            onPageChange={(page) => updateQuery({ page })}
            onPageSizeChange={(limit) => updateQuery({ limit, page: 1 })}
          />
        </>
      ) : null}
    </ManagementPageLayout>
  );
}

export function TeacherParentCreatePage() {
  const school = useAuthStore((state) => state.school);
  const navigate = useNavigate();
  const toast = useToast();
  const queryClient = useQueryClient();
  const studentsQuery = useTeacherStudentList({ page: 1, limit: 100, status: "ACTIVE", sortBy: "fullName", sortOrder: "asc" }, Boolean(school?.id));
  const createMutation = useMutation({
    mutationFn: (payload: Parameters<typeof createTeacherParent>[0]) => createTeacherParent(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: teacherParentKeys.all });
      toast.success("Akaun ibu bapa berjaya dicipta.");
      navigate("/guru/ibu-bapa");
    },
    onError: (error) => {
      const parsed = parseApiError(error);
      toast.error("Akaun ibu bapa tidak dapat dicipta.", parsed.message ?? "Sila cuba lagi.");
    },
  });

  return (
    <ManagementPageLayout
      breadcrumb={[{ label: "Guru", to: "/guru" }, { label: "Ibu Bapa", to: "/guru/ibu-bapa" }, { label: "Tambah Ibu Bapa" }]}
      title="Tambah Ibu Bapa"
      description="Cipta akaun ibu bapa dan pautkan murid berkaitan."
      currentAccent="secondary"
      actions={<Button asChild variant="outline" className="h-11 w-full gap-2 rounded-xl px-5 focus-visible:ring-secondary/30 sm:w-auto"><Link to="/guru/ibu-bapa"><ArrowLeft className="size-4" aria-hidden="true" />Kembali</Link></Button>}
    >
      {!school?.id ? <TeacherParentNoSchoolState /> : null}
      {school?.id ? (
        <TeacherParentForm
          mode="create"
          students={studentsQuery.data?.students ?? []}
          studentsLoading={studentsQuery.isLoading}
          studentsError={studentsQuery.isError}
          onRetryStudents={() => void studentsQuery.refetch()}
          submitting={createMutation.isPending}
          cancelPath="/guru/ibu-bapa"
          onSubmit={async (payload) => {
            await createMutation.mutateAsync(payload as Parameters<typeof createTeacherParent>[0]);
          }}
        />
      ) : null}
    </ManagementPageLayout>
  );
}

export function TeacherParentEditPage() {
  const { parentId = "" } = useParams();
  const school = useAuthStore((state) => state.school);
  const navigate = useNavigate();
  const toast = useToast();
  const queryClient = useQueryClient();
  const detailQuery = useTeacherParentDetail(parentId, Boolean(school?.id));
  const detail = detailQuery.data?.parent ?? null;
  const studentsQuery = useTeacherStudentList({ page: 1, limit: 100, status: "ACTIVE", sortBy: "fullName", sortOrder: "asc" }, Boolean(school?.id));
  const updateMutation = useMutation({
    mutationFn: (payload: Parameters<typeof updateTeacherParent>[1]) => updateTeacherParent(parentId, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: teacherParentKeys.all });
      toast.success("Maklumat ibu bapa berjaya dikemas kini.");
      navigate(`/guru/ibu-bapa/${parentId}`, { replace: true });
    },
    onError: (error) => {
      const parsed = parseApiError(error);
      toast.error("Maklumat ibu bapa tidak dapat dikemas kini.", parsed.message ?? "Sila cuba lagi.");
    },
  });
  const mergedStudents = React.useMemo(() => {
    const active = studentsQuery.data?.students ?? [];
    const current = toStudentListItems(detail);
    const byId = new Map([...active, ...current].map((item) => [item.id, item]));
    return [...byId.values()];
  }, [detail, studentsQuery.data?.students]);

  return (
    <ManagementPageLayout
      breadcrumb={[{ label: "Guru", to: "/guru" }, { label: "Ibu Bapa", to: "/guru/ibu-bapa" }, { label: "Edit Ibu Bapa" }]}
      title="Edit Ibu Bapa"
      description="Kemas kini maklumat ibu bapa atau penjaga dan pautan murid."
      currentAccent="secondary"
      actions={detail ? <Button asChild variant="outline" className="h-11 w-full gap-2 rounded-xl px-5 focus-visible:ring-secondary/30 sm:w-auto"><Link to={`/guru/ibu-bapa/${detail.id}`}><ArrowLeft className="size-4" aria-hidden="true" />Kembali</Link></Button> : null}
    >
      {!school?.id ? <TeacherParentNoSchoolState /> : null}
      {school?.id && (detailQuery.isLoading || studentsQuery.isLoading) ? <TeacherParentDetailSkeleton /> : null}
      {school?.id && detailQuery.isError ? <div className="mt-6"><TeacherParentErrorState onRetry={() => void detailQuery.refetch()} /></div> : null}
      {school?.id && !detailQuery.isLoading && !detailQuery.isError && detail ? (
        <TeacherParentForm
          mode="edit"
          detail={detail}
          students={mergedStudents}
          studentsLoading={studentsQuery.isLoading}
          studentsError={studentsQuery.isError}
          onRetryStudents={() => void studentsQuery.refetch()}
          submitting={updateMutation.isPending}
          cancelPath={`/guru/ibu-bapa/${detail.id}`}
          onSubmit={async (payload) => {
            await updateMutation.mutateAsync(payload as Parameters<typeof updateTeacherParent>[1]);
          }}
        />
      ) : null}
    </ManagementPageLayout>
  );
}

export function TeacherParentDetailPage() {
  const { parentId = "" } = useParams();
  const school = useAuthStore((state) => state.school);
  const toast = useToast();
  const queryClient = useQueryClient();
  const detailQuery = useTeacherParentDetail(parentId, Boolean(school?.id));
  const detail = detailQuery.data?.parent ?? null;
  const statusMutation = useMutation({
    mutationFn: (status: TeacherParentStatusUpdatePayload["status"]) => updateTeacherParentStatus(parentId, { status }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: teacherParentKeys.all });
      await queryClient.invalidateQueries({ queryKey: teacherParentKeys.detail(parentId) });
      toast.success("Status ibu bapa berjaya dikemas kini.");
    },
    onError: (error) => {
      const parsed = parseApiError(error);
      toast.error("Status ibu bapa tidak dapat dikemas kini.", parsed.message ?? "Sila cuba lagi.");
    },
  });
  const resendMutation = useMutation({
    mutationFn: () => resendTeacherParentSetup(parentId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: teacherParentKeys.detail(parentId) });
      toast.success("E-mel jemputan berjaya dihantar semula.");
    },
    onError: (error) => {
      const parsed = parseApiError(error);
      toast.error("E-mel jemputan tidak dapat dihantar semula.", parsed.message ?? "Sila cuba lagi.");
    },
  });

  return (
    <ManagementPageLayout
      breadcrumb={[{ label: "Guru", to: "/guru" }, { label: "Ibu Bapa", to: "/guru/ibu-bapa" }, { label: "Butiran Ibu Bapa" }]}
      title="Butiran Ibu Bapa"
      description="Lihat dan urus maklumat akaun, anak dipautkan dan status ibu bapa."
      currentAccent="secondary"
      actions={detail ? (
        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
          <Button asChild variant="outline" className="h-11 w-full gap-2 rounded-xl px-5 focus-visible:ring-secondary/30 sm:w-auto">
            <Link to="/guru/ibu-bapa">
              <ArrowLeft className="size-4" aria-hidden="true" />
              Kembali
            </Link>
          </Button>
          <Button asChild className="h-11 w-full gap-2 rounded-xl bg-primary px-5 font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 focus-visible:ring-primary/30 sm:w-auto">
            <Link to={`/guru/ibu-bapa/${detail.id}/edit`}>
              <Pencil className="size-4" aria-hidden="true" />
              Edit Ibu Bapa
            </Link>
          </Button>
        </div>
      ) : null}
    >
      {!school?.id ? <TeacherParentNoSchoolState /> : null}
      {school?.id && detailQuery.isLoading ? <TeacherParentDetailSkeleton /> : null}
      {school?.id && detailQuery.isError ? <div className="mt-6"><TeacherParentErrorState onRetry={() => void detailQuery.refetch()} /></div> : null}
      {school?.id && !detailQuery.isLoading && !detailQuery.isError && detail ? (
        <TeacherParentDetailView
          detail={detail}
          statusPending={statusMutation.isPending}
          resendPending={resendMutation.isPending}
          statusError={statusMutation.error ? parseApiError(statusMutation.error).message : null}
          resendError={resendMutation.error ? parseApiError(resendMutation.error).message : null}
          onStatusChange={async (status) => {
            await statusMutation.mutateAsync(status);
            return true;
          }}
          onResendSetup={async () => {
            await resendMutation.mutateAsync();
          }}
        />
      ) : null}
    </ManagementPageLayout>
  );
}
