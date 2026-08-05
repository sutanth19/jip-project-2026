import { useQuery } from "@tanstack/react-query";

import { getTeacherParentDetail } from "@/features/teacher/api/teacher-parent.api";

import { teacherParentKeys } from "./use-teacher-parent-list";

export function useTeacherParentDetail(parentId: string, enabled = true) {
  return useQuery({
    queryKey: teacherParentKeys.detail(parentId),
    queryFn: () => getTeacherParentDetail(parentId),
    enabled: Boolean(parentId) && enabled,
    staleTime: 30_000,
  });
}
