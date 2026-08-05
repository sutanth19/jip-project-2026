import * as React from "react";
import { useSearchParams } from "react-router-dom";

import { ManagementPageLayout } from "@/components/shared";
import {
  AddStudentButton,
  TeacherStudentEmptyState,
  TeacherStudentErrorState,
  TeacherStudentFilteredEmptyState,
  TeacherStudentListFilters,
  TeacherStudentListLoading,
  TeacherStudentListTable,
  TeacherStudentMobileCards,
  TeacherStudentNoSchoolState,
  TeacherStudentPagination,
} from "@/features/teacher/components/TeacherStudentList";
import { useTeacherClassList } from "@/features/teacher/hooks/use-teacher-class-list";
import { useTeacherStudentList } from "@/features/teacher/hooks/use-teacher-student-list";
import type { TeacherStudentListQuery } from "@/features/teacher/types/teacher-student.types";
import { defaultTeacherClassQuery } from "@/features/teacher/utils/teacher-class";
import { defaultTeacherStudentQuery, teacherStudentResetQuery } from "@/features/teacher/utils/teacher-student";
import { useAuthStore } from "@/stores/auth-store";

function numberParam(value: string | null): number | undefined {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function searchParamsToQuery(searchParams: URLSearchParams): Partial<TeacherStudentListQuery> {
  return {
    page: numberParam(searchParams.get("page")) ?? defaultTeacherStudentQuery.page,
    limit: numberParam(searchParams.get("limit")) ?? defaultTeacherStudentQuery.limit,
    search: searchParams.get("search") ?? undefined,
    yearLevel: numberParam(searchParams.get("yearLevel")),
    classId: searchParams.get("classId") ?? undefined,
    status: (searchParams.get("status") as TeacherStudentListQuery["status"] | null) ?? undefined,
    sortBy: (searchParams.get("sortBy") as TeacherStudentListQuery["sortBy"] | null) ?? defaultTeacherStudentQuery.sortBy,
    sortOrder: (searchParams.get("sortOrder") as TeacherStudentListQuery["sortOrder"] | null) ?? defaultTeacherStudentQuery.sortOrder,
  };
}

function queryToSearchParams(query: Partial<TeacherStudentListQuery>) {
  const next = new URLSearchParams();

  Object.entries(query).forEach(([key, value]) => {
    if (value === undefined || value === "") return;
    next.set(key, String(value));
  });

  return next;
}

export function TeacherStudentListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const school = useAuthStore((state) => state.school);
  const query = React.useMemo(() => searchParamsToQuery(searchParams), [searchParams]);
  const studentList = useTeacherStudentList(query, Boolean(school?.id));
  const classList = useTeacherClassList({
    page: 1,
    limit: 100,
    status: "ACTIVE",
    sortBy: defaultTeacherClassQuery.sortBy,
    sortOrder: defaultTeacherClassQuery.sortOrder,
  }, Boolean(school?.id));

  const updateQuery = React.useCallback((patch: Partial<TeacherStudentListQuery>) => {
    const nextQuery = {
      ...query,
      ...patch,
    };
    setSearchParams(queryToSearchParams(nextQuery), { replace: true });
  }, [query, setSearchParams]);

  const resetFilters = React.useCallback(() => updateQuery(teacherStudentResetQuery()), [updateQuery]);
  const hasFilters = Boolean(query.search?.trim() || query.yearLevel || query.classId || query.status);
  const canCreate = Boolean(school?.id);

  return (
    <ManagementPageLayout
      title="Murid"
      description="Urus murid Program Pemulihan Khas bagi sekolah anda."
      currentAccent="secondary"
      actions={canCreate ? <AddStudentButton /> : null}
    >
      <TeacherStudentListFilters
        query={query}
        classes={classList.data?.classes ?? []}
        classOptionsLoading={classList.isLoading}
        onChange={updateQuery}
      />

      {!school?.id ? <div className="mt-6"><TeacherStudentNoSchoolState /></div> : null}

      {school?.id && studentList.isLoading ? <TeacherStudentListLoading /> : null}
      {school?.id && studentList.isError ? <div className="mt-6"><TeacherStudentErrorState onRetry={() => void studentList.refetch()} /></div> : null}

      {school?.id && !studentList.isLoading && !studentList.isError && studentList.data?.students.length === 0 && !hasFilters ? (
        <div className="mt-6"><TeacherStudentEmptyState canCreate={canCreate} /></div>
      ) : null}

      {school?.id && !studentList.isLoading && !studentList.isError && studentList.data?.students.length === 0 && hasFilters ? (
        <div className="mt-6"><TeacherStudentFilteredEmptyState onReset={resetFilters} /></div>
      ) : null}

      {school?.id && !studentList.isLoading && !studentList.isError && (studentList.data?.students.length ?? 0) > 0 ? (
        <>
          <TeacherStudentListTable rows={studentList.data?.students ?? []} />
          <TeacherStudentMobileCards rows={studentList.data?.students ?? []} />
          <TeacherStudentPagination
            page={studentList.data?.pagination.page ?? query.page ?? defaultTeacherStudentQuery.page}
            limit={studentList.data?.pagination.limit ?? query.limit ?? defaultTeacherStudentQuery.limit}
            total={studentList.data?.pagination.total ?? 0}
            totalPages={studentList.data?.pagination.totalPages ?? 0}
            onPageChange={(page) => updateQuery({ page })}
            onPageSizeChange={(limit) => updateQuery({ limit, page: 1 })}
          />
        </>
      ) : null}
    </ManagementPageLayout>
  );
}
