import { apiRequest } from "@/lib/api";
import type {
  TeacherParentCreatePayload,
  TeacherParentCreateResult,
  TeacherParentDetailResponse,
  TeacherParentListQuery,
  TeacherParentListResponse,
  TeacherParentResendResult,
  TeacherParentStatusResult,
  TeacherParentStatusUpdatePayload,
  TeacherParentUpdatePayload,
  TeacherParentUpdateResult,
} from "@/features/teacher/types/teacher-parent.types";
import { normalizeTeacherParentListResponse } from "@/features/teacher/utils/teacher-parent";

function toSearchParams(query: Partial<TeacherParentListQuery>) {
  return new URLSearchParams(
    Object.entries(query).flatMap(([key, value]) => (value === undefined || value === "" ? [] : [[key, String(value)]])),
  ).toString();
}

export async function listTeacherParents(query: Partial<TeacherParentListQuery>): Promise<TeacherParentListResponse> {
  const suffix = toSearchParams(query);
  return normalizeTeacherParentListResponse(await apiRequest<unknown>(`/parents${suffix ? `?${suffix}` : ""}`));
}

export async function getTeacherParentDetail(parentId: string): Promise<TeacherParentDetailResponse> {
  const value = await apiRequest<unknown>(`/parents/${parentId}`);
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return { parent: (value as { parent?: TeacherParentDetailResponse["parent"] }).parent ?? null };
  }
  return { parent: null };
}

export async function createTeacherParent(payload: TeacherParentCreatePayload): Promise<TeacherParentCreateResult> {
  return apiRequest<TeacherParentCreateResult>("/parents", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateTeacherParent(parentId: string, payload: TeacherParentUpdatePayload): Promise<TeacherParentUpdateResult> {
  return apiRequest<TeacherParentUpdateResult>(`/parents/${parentId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function updateTeacherParentStatus(parentId: string, payload: TeacherParentStatusUpdatePayload): Promise<TeacherParentStatusResult> {
  return apiRequest<TeacherParentStatusResult>(`/parents/${parentId}/status`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function resendTeacherParentSetup(parentId: string): Promise<TeacherParentResendResult> {
  return apiRequest<TeacherParentResendResult>(`/parents/${parentId}/resend-setup`, {
    method: "POST",
  });
}
