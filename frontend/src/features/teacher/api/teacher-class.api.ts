import { apiRequest } from "@/lib/api";
import type { TeacherClassDetailResponse, TeacherClassListQuery, TeacherClassListResponse, TeacherClassStudentsResponse } from "@/features/teacher/types/teacher-class.types";
import type { TeacherClassCreatePayload } from "@/features/teacher/utils/teacher-class-create";
import { normalizeTeacherClassDetailResponse, normalizeTeacherClassListResponse, normalizeTeacherClassStudentsResponse } from "@/features/teacher/utils/teacher-class";

function toSearchParams(query: Partial<TeacherClassListQuery>) {
  const params = new URLSearchParams();

  Object.entries(query).forEach(([key, value]) => {
    if (value === undefined || value === "") return;
    params.set(key, String(value));
  });

  const serialized = params.toString();
  return serialized ? `?${serialized}` : "";
}

export async function listTeacherClasses(query: Partial<TeacherClassListQuery>): Promise<TeacherClassListResponse> {
  return normalizeTeacherClassListResponse(await apiRequest<unknown>(`/classes${toSearchParams(query)}`));
}

export async function createTeacherClass(payload: TeacherClassCreatePayload) {
  return apiRequest<{ class: unknown }>("/classes", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getTeacherClassDetail(classId: string): Promise<TeacherClassDetailResponse> {
  return normalizeTeacherClassDetailResponse(await apiRequest<unknown>(`/classes/${classId}`));
}

export async function listTeacherClassStudents(classId: string): Promise<TeacherClassStudentsResponse> {
  return normalizeTeacherClassStudentsResponse(await apiRequest<unknown>(`/classes/${classId}/students?limit=5`));
}

export async function updateTeacherClass(classId: string, payload: TeacherClassCreatePayload): Promise<TeacherClassDetailResponse> {
  return normalizeTeacherClassDetailResponse(await apiRequest<unknown>(`/classes/${classId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  }));
}

export async function updateTeacherClassStatus(classId: string, status: "ACTIVE" | "ARCHIVED"): Promise<TeacherClassDetailResponse> {
  return normalizeTeacherClassDetailResponse(await apiRequest<unknown>(`/classes/${classId}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  }));
}
