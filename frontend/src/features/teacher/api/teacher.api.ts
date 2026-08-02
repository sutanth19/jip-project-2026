import { apiRequest } from "@/lib/api";
import type { TeacherListResult, TeacherRecord, TeacherResource } from "@/features/teacher/types/teacher.types";
import { normalizeList } from "@/features/teacher/utils/teacher-record";

const endpoints: Record<TeacherResource, { path: string; keys: string[] }> = {
  classes: { path: "/classes", keys: ["classes"] }, students: { path: "/students", keys: ["students"] },
  activities: { path: "/digital-activities", keys: ["activities", "digitalActivities"] }, assignments: { path: "/assignments", keys: ["assignments"] },
  submissions: { path: "/submissions", keys: ["submissions"] }, assessments: { path: "/assessments", keys: ["assessments"] },
  evidence: { path: "/pbd/evidence", keys: ["evidence"] }, mastery: { path: "/pbd/mastery", keys: ["mastery"] },
  notifications: { path: "/notifications", keys: ["notifications"] }, announcements: { path: "/announcements", keys: ["announcements"] }, ai: { path: "/ai/outputs", keys: ["outputs"] },
};

function queryString(query: Record<string, string | number | boolean | undefined>) {
  const params = new URLSearchParams(); Object.entries(query).forEach(([key, value]) => { if (value !== undefined && value !== "") params.set(key, String(value)); });
  return params.size ? `?${params}` : "";
}
export async function teacherDashboard(): Promise<TeacherRecord> { const value = await apiRequest<unknown>("/dashboard/teacher"); return typeof value === "object" && value !== null ? value as TeacherRecord : {}; }
export async function teacherList(resource: TeacherResource, query: Record<string, string | number | boolean | undefined> = {}): Promise<TeacherListResult> { const config = endpoints[resource]; return normalizeList(await apiRequest<unknown>(`${config.path}${queryString(query)}`), config.keys); }
export async function teacherDetail(resource: TeacherResource, id: string): Promise<TeacherRecord> { const value = await apiRequest<unknown>(`${endpoints[resource].path}/${id}`); if (typeof value !== "object" || value === null) return {}; const record = value as TeacherRecord; return (Object.values(record).find((entry) => typeof entry === "object" && entry !== null && !Array.isArray(entry)) as TeacherRecord | undefined) ?? record; }
export async function teacherPost(path: string, body: TeacherRecord = {}): Promise<TeacherRecord> { const value = await apiRequest<unknown>(path, { method: "POST", body: JSON.stringify(body) }); return typeof value === "object" && value !== null ? value as TeacherRecord : {}; }
export async function teacherPatch(path: string, body: TeacherRecord): Promise<TeacherRecord> { const value = await apiRequest<unknown>(path, { method: "PATCH", body: JSON.stringify(body) }); return typeof value === "object" && value !== null ? value as TeacherRecord : {}; }
