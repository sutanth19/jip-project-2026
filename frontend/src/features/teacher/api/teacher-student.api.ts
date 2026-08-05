import { apiRequest } from "@/lib/api";
import type { TeacherStudentCreatePayload, TeacherStudentCreateResult, TeacherStudentDetailResponse, TeacherStudentListQuery, TeacherStudentListResponse, TeacherStudentPinResetResult, TeacherStudentStatusUpdatePayload, TeacherStudentUpdatePayload } from "@/features/teacher/types/teacher-student.types";
import { normalizeTeacherStudentListResponse } from "@/features/teacher/utils/teacher-student";
import { normalizeTeacherStudentDetailResponse } from "@/features/teacher/utils/teacher-student-detail";

function toSearchParams(query: Partial<TeacherStudentListQuery>) {
  const params = new URLSearchParams();

  Object.entries(query).forEach(([key, value]) => {
    if (value === undefined || value === "") return;
    params.set(key, String(value));
  });

  const serialized = params.toString();
  return serialized ? `?${serialized}` : "";
}

export async function listTeacherStudents(query: Partial<TeacherStudentListQuery>): Promise<TeacherStudentListResponse> {
  return normalizeTeacherStudentListResponse(await apiRequest<unknown>(`/students${toSearchParams(query)}`));
}

export async function createTeacherStudent(payload: TeacherStudentCreatePayload): Promise<TeacherStudentCreateResult> {
  return apiRequest<TeacherStudentCreateResult>("/students", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getTeacherStudentDetail(studentProfileId: string): Promise<TeacherStudentDetailResponse> {
  return normalizeTeacherStudentDetailResponse(await apiRequest<unknown>(`/students/${studentProfileId}`));
}

export async function updateTeacherStudent(studentProfileId: string, payload: TeacherStudentUpdatePayload): Promise<TeacherStudentDetailResponse> {
  return normalizeTeacherStudentDetailResponse(await apiRequest<unknown>(`/students/${studentProfileId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  }));
}

export async function updateTeacherStudentStatus(studentProfileId: string, payload: TeacherStudentStatusUpdatePayload): Promise<TeacherStudentDetailResponse> {
  return normalizeTeacherStudentDetailResponse(await apiRequest<unknown>(`/students/${studentProfileId}/status`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  }));
}

export async function resetTeacherStudentPin(studentProfileId: string): Promise<TeacherStudentPinResetResult> {
  return apiRequest<TeacherStudentPinResetResult>(`/students/${studentProfileId}/reset-pin`, {
    method: "POST",
  });
}
