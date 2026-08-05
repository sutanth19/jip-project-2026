import { useQuery } from "@tanstack/react-query";

import { listTeacherParents } from "@/features/teacher/api/teacher-parent.api";
import type { TeacherParentListQuery } from "@/features/teacher/types/teacher-parent.types";

export const teacherParentKeys = {
  all: ["teacher", "parents"] as const,
  list: (query: Partial<TeacherParentListQuery>) => ["teacher", "parents", query] as const,
  detail: (parentId: string) => ["teacher", "parents", "detail", parentId] as const,
};

export function useTeacherParentList(query: Partial<TeacherParentListQuery>, enabled = true) {
  return useQuery({
    queryKey: teacherParentKeys.list(query),
    queryFn: () => listTeacherParents(query),
    enabled,
    staleTime: 30_000,
  });
}
