import { Plus } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import * as React from "react";

import { ManagementPageLayout } from "@/components/shared";
import { Button } from "@/components/ui/button";
import {
  TeacherClassEmptyState,
  TeacherClassErrorState,
  TeacherClassFilteredEmptyState,
  TeacherClassListFilters,
  TeacherClassListLoading,
  TeacherClassListTable,
  TeacherClassMobileCards,
  TeacherClassNoSchoolState,
  TeacherClassPagination,
} from "@/features/teacher/components/TeacherClassList";
import { useTeacherClassList } from "@/features/teacher/hooks/use-teacher-class-list";
import type { TeacherClassListQuery } from "@/features/teacher/types/teacher-class.types";
import { defaultTeacherClassQuery } from "@/features/teacher/utils/teacher-class";
import { useAuthStore } from "@/stores/auth-store";

function numberParam(value: string | null): number | undefined {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function searchParamsToQuery(searchParams: URLSearchParams): Partial<TeacherClassListQuery> {
  return {
    page: numberParam(searchParams.get("page")) ?? defaultTeacherClassQuery.page,
    limit: numberParam(searchParams.get("limit")) ?? defaultTeacherClassQuery.limit,
    search: searchParams.get("search") ?? undefined,
    yearLevel: numberParam(searchParams.get("yearLevel")),
    academicYear: numberParam(searchParams.get("academicYear")) ?? defaultTeacherClassQuery.academicYear,
    status: (searchParams.get("status") as TeacherClassListQuery["status"] | null) ?? undefined,
    sortBy: (searchParams.get("sortBy") as TeacherClassListQuery["sortBy"] | null) ?? defaultTeacherClassQuery.sortBy,
    sortOrder: (searchParams.get("sortOrder") as TeacherClassListQuery["sortOrder"] | null) ?? defaultTeacherClassQuery.sortOrder,
  };
}

function queryToSearchParams(query: Partial<TeacherClassListQuery>) {
  const next = new URLSearchParams();

  Object.entries(query).forEach(([key, value]) => {
    if (value === undefined || value === "") return;
    next.set(key, String(value));
  });

  return next;
}

export function TeacherClassListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const school = useAuthStore((state) => state.school);
  const query = React.useMemo(() => searchParamsToQuery(searchParams), [searchParams]);
  const classList = useTeacherClassList(query, Boolean(school?.id));
  const academicYearOptions = React.useMemo(() => {
    const currentYear = defaultTeacherClassQuery.academicYear ?? new Date().getFullYear();
    const fromResults = (classList.data?.classes ?? []).map((item) => item.academicYear);
    const values = new Set([currentYear, currentYear - 1, currentYear + 1, ...fromResults]);
    return [...values].sort((left, right) => right - left);
  }, [classList.data?.classes]);

  const updateQuery = React.useCallback((patch: Partial<TeacherClassListQuery>) => {
    const nextQuery = {
      ...query,
      ...patch,
    };
    setSearchParams(queryToSearchParams(nextQuery), { replace: true });
  }, [query, setSearchParams]);

  const hasFilters = Boolean(query.search?.trim() || query.yearLevel || query.status || (query.academicYear !== undefined && query.academicYear !== defaultTeacherClassQuery.academicYear));
  const canCreate = Boolean(school?.id);

  return (
    <ManagementPageLayout
      title="Kelas"
      description="Urus kelas asal murid bagi sekolah anda."
      currentAccent="secondary"
      actions={
        canCreate ? (
          <Button asChild variant="secondary">
            <Link
              to="/guru/kelas/tambah"
              className="h-12 rounded-xl px-6 font-semibold shadow-sm hover:bg-secondary/90 focus-visible:ring-secondary/30"
            >
              <Plus className="size-4" aria-hidden="true" />
              Tambah Kelas
            </Link>
          </Button>
        ) : null
      }
    >
      <TeacherClassListFilters
        query={query}
        academicYearOptions={academicYearOptions}
        onChange={updateQuery}
      />

      {!school?.id ? <div className="mt-6"><TeacherClassNoSchoolState /></div> : null}

      {school?.id && classList.isLoading ? <TeacherClassListLoading /> : null}
      {school?.id && classList.isError ? <div className="mt-6"><TeacherClassErrorState onRetry={() => void classList.refetch()} /></div> : null}

      {school?.id && !classList.isLoading && !classList.isError && classList.data?.classes.length === 0 && !hasFilters ? (
        <div className="mt-6"><TeacherClassEmptyState hasFilters={false} canCreate={canCreate} /></div>
      ) : null}

      {school?.id && !classList.isLoading && !classList.isError && classList.data?.classes.length === 0 && hasFilters ? (
        <div className="mt-6"><TeacherClassFilteredEmptyState onReset={() => updateQuery({ search: undefined, yearLevel: undefined, status: undefined, academicYear: defaultTeacherClassQuery.academicYear, page: 1 })} /></div>
      ) : null}

      {school?.id && !classList.isLoading && !classList.isError && (classList.data?.classes.length ?? 0) > 0 ? (
        <>
          <TeacherClassListTable rows={classList.data?.classes ?? []} />
          <TeacherClassMobileCards rows={classList.data?.classes ?? []} />
          <TeacherClassPagination
            page={classList.data?.pagination.page ?? query.page ?? defaultTeacherClassQuery.page}
            limit={classList.data?.pagination.limit ?? query.limit ?? defaultTeacherClassQuery.limit}
            total={classList.data?.pagination.total ?? 0}
            totalPages={classList.data?.pagination.totalPages ?? 0}
            onPageChange={(page) => updateQuery({ page })}
            onPageSizeChange={(limit) => updateQuery({ limit, page: 1 })}
          />
        </>
      ) : null}
    </ManagementPageLayout>
  );
}
