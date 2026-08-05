import { apiRequest } from "@/lib/api";
export type NotificationRecord=Record<string,unknown>;
const record=(v:unknown):NotificationRecord=>typeof v==="object"&&v!==null&&!Array.isArray(v)?v as NotificationRecord:{};
export async function notifications(query=""){const v=record(await apiRequest<unknown>(`/notifications${query}`));return{notifications:Array.isArray(v.notifications)?v.notifications.filter((x):x is NotificationRecord=>typeof x==="object"&&x!==null&&!Array.isArray(x)):[],unreadCount:typeof v.unreadCount==="number"?v.unreadCount:0}}
export const notificationPost=(path:string,body:NotificationRecord={})=>apiRequest<unknown>(path,{method:"POST",body:JSON.stringify(body)});
export const notificationPreferences=()=>apiRequest<NotificationRecord>("/preferences");
export const updateNotificationPreferences=(body:NotificationRecord)=>apiRequest<NotificationRecord>("/preferences",{method:"PATCH",body:JSON.stringify(body)});
