import { useQuery } from "@tanstack/react-query";

import { getTeacherClassDetail, listTeacherClasses, listTeacherClassStudents } from "@/features/teacher/api/teacher-class.api";
import type { TeacherClassListQuery } from "@/features/teacher/types/teacher-class.types";

export const teacherClassKeys = {
  all: ["teacher", "classes"] as const,
  list: (query: Partial<TeacherClassListQuery>) => ["teacher", "classes", query] as const,
  detail: (classId: string) => ["teacher", "classes", "detail", classId] as const,
  students: (classId: string) => ["teacher", "classes", "students", classId] as const,
};

export function useTeacherClassList(query: Partial<TeacherClassListQuery>, enabled = true) {
  return useQuery({
    queryKey: teacherClassKeys.list(query),
    queryFn: () => listTeacherClasses(query),
    enabled,
    staleTime: 30_000,
  });
}

export function useTeacherClassDetail(classId: string) {
  return useQuery({
    queryKey: teacherClassKeys.detail(classId),
    queryFn: () => getTeacherClassDetail(classId),
    enabled: Boolean(classId),
    staleTime: 30_000,
  });
}

export function useTeacherClassStudents(classId: string, enabled = true) {
  return useQuery({
    queryKey: teacherClassKeys.students(classId),
    queryFn: () => listTeacherClassStudents(classId),
    enabled: Boolean(classId) && enabled,
    staleTime: 30_000,
  });
}
