import { useQueries, useQuery } from "@tanstack/react-query"

import { getTeacherActivityDetail, getTeacherActivityPreview, listTeacherActivities } from "@/features/teacher/api/teacher-activity.api"
import type { TeacherActivityDomain, TeacherActivityListQuery } from "@/features/teacher/utils/teacher-activity"
import { teacherActivityDomains } from "@/features/teacher/utils/teacher-activity"

export const teacherActivityKeys = {
  all: ["teacher", "activity-library"] as const,
  list: (domain: TeacherActivityDomain, query: TeacherActivityListQuery) => ["teacher", "activity-library", "list", domain, query] as const,
  preview: (activityId: string) => ["teacher", "activity-library", "preview", activityId] as const,
  detail: (activityId: string) => ["teacher", "activity-library", "detail", activityId] as const,
  counts: ["teacher", "activity-library", "counts"] as const,
}

export function useTeacherActivityList(domain: TeacherActivityDomain, query: TeacherActivityListQuery) {
  return useQuery({
    queryKey: teacherActivityKeys.list(domain, query),
    queryFn: () => listTeacherActivities(domain, query),
    staleTime: 30_000,
  })
}

export function useTeacherActivityPreview(activityId: string) {
  return useQuery({
    queryKey: teacherActivityKeys.preview(activityId),
    queryFn: () => getTeacherActivityPreview(activityId),
    enabled: Boolean(activityId),
    staleTime: 30_000,
  })
}

export function useTeacherActivityDetail(activityId: string) {
  return useQuery({
    queryKey: teacherActivityKeys.detail(activityId),
    queryFn: () => getTeacherActivityDetail(activityId),
    enabled: Boolean(activityId),
    staleTime: 30_000,
  })
}

export function useTeacherActivityCategoryCounts() {
  const queries = useQueries({
    queries: teacherActivityDomains.map((domain) => ({
      queryKey: teacherActivityKeys.list(domain.value, { page: 1, limit: 1 }),
      queryFn: () => listTeacherActivities(domain.value, { page: 1, limit: 1 }),
      staleTime: 30_000,
    })),
  })

  return {
    queries,
    counts: teacherActivityDomains.reduce<Record<TeacherActivityDomain, number>>((result, domain, index) => {
      result[domain.value] = queries[index]?.data?.meta.total ?? 0
      return result
    }, { READING: 0, WRITING: 0, NUMERACY: 0 }),
    isLoading: queries.some((query) => query.isLoading),
    isError: queries.some((query) => query.isError),
  }
}
