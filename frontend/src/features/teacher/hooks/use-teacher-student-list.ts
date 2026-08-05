import { useQuery } from "@tanstack/react-query";

import { listTeacherStudents } from "@/features/teacher/api/teacher-student.api";
import type { TeacherStudentListQuery } from "@/features/teacher/types/teacher-student.types";

export const teacherStudentKeys = {
  all: ["teacher", "students"] as const,
  list: (query: Partial<TeacherStudentListQuery>) => ["teacher", "students", query] as const,
};

export function useTeacherStudentList(query: Partial<TeacherStudentListQuery>, enabled = true) {
  return useQuery({
    queryKey: teacherStudentKeys.list(query),
    queryFn: () => listTeacherStudents(query),
    enabled,
    staleTime: 30_000,
  });
}
