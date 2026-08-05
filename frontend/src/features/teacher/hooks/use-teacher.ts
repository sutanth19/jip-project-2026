import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { teacherDashboard, teacherDetail, teacherList, teacherPatch, teacherPost } from "@/features/teacher/api/teacher.api";
import type { TeacherRecord, TeacherResource } from "@/features/teacher/types/teacher.types";
export const teacherKeys = { all: ["teacher"] as const, list: (r: TeacherResource, q: Record<string, string | number | boolean | undefined>) => ["teacher", r, q] as const, detail: (r: TeacherResource, id: string) => ["teacher", r, id] as const };
export function useTeacherDashboard() { return useQuery({ queryKey: ["teacher", "dashboard"], queryFn: teacherDashboard, staleTime: 30_000 }); }
export function useTeacherList(resource: TeacherResource, query: Record<string, string | number | boolean | undefined> = {}) { return useQuery({ queryKey: teacherKeys.list(resource, query), queryFn: () => teacherList(resource, query), staleTime: 30_000 }); }
export function useTeacherDetail(resource: TeacherResource, id: string) { return useQuery({ queryKey: teacherKeys.detail(resource, id), queryFn: () => teacherDetail(resource, id), enabled: Boolean(id), staleTime: 30_000 }); }
export function useTeacherPost() { const client = useQueryClient(); return useMutation({ mutationFn: ({ path, body }: { path: string; body?: TeacherRecord }) => teacherPost(path, body), onSuccess: () => void client.invalidateQueries({ queryKey: teacherKeys.all }) }); }
export function useTeacherPatch() { const client = useQueryClient(); return useMutation({ mutationFn: ({ path, body }: { path: string; body: TeacherRecord }) => teacherPatch(path, body), onSuccess: () => void client.invalidateQueries({ queryKey: teacherKeys.all }) }); }
