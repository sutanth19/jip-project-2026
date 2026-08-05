import { useQuery } from "@tanstack/react-query";

import { getTeacherStudentDetail } from "@/features/teacher/api/teacher-student.api";

export const teacherStudentDetailKeys = {
  all: ["teacher", "students", "detail"] as const,
  detail: (studentProfileId: string) => ["teacher", "students", "detail", studentProfileId] as const,
};

export function useTeacherStudentDetail(studentProfileId: string, enabled = true) {
  return useQuery({
    queryKey: teacherStudentDetailKeys.detail(studentProfileId),
    queryFn: () => getTeacherStudentDetail(studentProfileId),
    enabled: Boolean(studentProfileId) && enabled,
    staleTime: 30_000,
  });
}
