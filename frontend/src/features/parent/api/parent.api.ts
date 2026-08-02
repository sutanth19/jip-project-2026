import { apiRequest } from "@/lib/api";
import type { ParentRecord, ParentResource } from "@/features/parent/types/parent.types";
import { isParentRecord, parentList } from "@/features/parent/utils/parent-record";
export async function parentDashboard():Promise<ParentRecord>{const v=await apiRequest<unknown>("/dashboard/parent");return isParentRecord(v)?v:{}}
export async function parentChildList(kind:ParentResource,studentId:string):Promise<ParentRecord[]>{const endpoint={assignments:"assignments",submissions:"submissions",assessments:"assessments"}[kind];const v=await apiRequest<unknown>(`/parent/children/${studentId}/${endpoint}`);return parentList(v,endpoint)}
export async function parentProgress(studentId:string):Promise<ParentRecord>{const v=await apiRequest<unknown>(`/parent/children/${studentId}/progress`);return isParentRecord(v)?v:{}}
export async function parentReport(studentId:string):Promise<ParentRecord>{const v=await apiRequest<unknown>(`/reports/parent/${studentId}`);return isParentRecord(v)?v:{}}
export async function parentListApi(path:string,key:string):Promise<ParentRecord[]>{return parentList(await apiRequest<unknown>(path),key)}
export async function parentProfile():Promise<ParentRecord>{const v=await apiRequest<unknown>("/profile/me");return isParentRecord(v)&&isParentRecord(v.profile)?v.profile:{}}
