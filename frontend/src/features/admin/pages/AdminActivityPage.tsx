import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";

import { PageContainer } from "@/components/shared";
import { listAdminActivities, listAdminActivityTemplateOptions, getAdminActivitySummary } from "@/features/admin/api/admin-activity.api";
import { AdminActivityManagementView } from "@/features/admin/components/AdminActivityManagement";
import {
  adminActivityQueryFromSearchParams,
  defaultAdminActivityQuery,
  toAdminActivitySearchParams,
  type AdminActivityListQuery,
} from "@/features/admin/utils/admin-activity";

function useAdminActivityQueryState() {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = React.useMemo(() => adminActivityQueryFromSearchParams(searchParams), [searchParams]);

  const updateQuery = React.useCallback((patch: Partial<AdminActivityListQuery>) => {
    const nextQuery = { ...query, ...patch };
    const params = new URLSearchParams(toAdminActivitySearchParams(nextQuery).replace(/^\?/, ""));

    if (nextQuery.page === defaultAdminActivityQuery.page) params.delete("page");
    if (nextQuery.limit === defaultAdminActivityQuery.limit) params.delete("limit");
    if (nextQuery.sortBy === defaultAdminActivityQuery.sortBy) params.delete("sortBy");
    if (nextQuery.sortOrder === defaultAdminActivityQuery.sortOrder) params.delete("sortOrder");

    setSearchParams(params, { replace: true });
  }, [query, setSearchParams]);

  return { query, updateQuery };
}

export function AdminActivityPage() {
  const { query, updateQuery } = useAdminActivityQueryState();

  const summaryQuery = useQuery({
    queryKey: ["admin", "activities", "summary", query.templateCategory],
    queryFn: () => getAdminActivitySummary({ templateCategory: query.templateCategory }),
    staleTime: 30_000,
  });

  const templatesQuery = useQuery({
    queryKey: ["admin", "activities", "templates"],
    queryFn: listAdminActivityTemplateOptions,
    staleTime: 60_000,
  });

  const activitiesQuery = useQuery({
    queryKey: ["admin", "activities", "list", query],
    queryFn: () => listAdminActivities(query),
    staleTime: 30_000,
  });

  return (
    <PageContainer>
      <AdminActivityManagementView
        query={query}
        summary={summaryQuery.data}
        summaryLoading={summaryQuery.isLoading}
        summaryError={summaryQuery.isError}
        activities={activitiesQuery.data}
        templates={templatesQuery.data ?? []}
        isLoading={activitiesQuery.isLoading}
        isError={activitiesQuery.isError}
        onRetrySummary={() => void summaryQuery.refetch()}
        onRetryActivities={() => void activitiesQuery.refetch()}
        onChange={updateQuery}
      />
    </PageContainer>
  );
}
