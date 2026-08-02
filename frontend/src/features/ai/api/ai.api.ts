import { apiRequest } from "@/lib/api";
export type AiRecord=Record<string,unknown>;
const record=(v:unknown):AiRecord=>typeof v==="object"&&v!==null&&!Array.isArray(v)?v as AiRecord:{};
export async function aiOutputs():Promise<AiRecord[]>{const v=await apiRequest<unknown>("/ai/outputs");return Array.isArray(v)?v.filter((x):x is AiRecord=>typeof x==="object"&&x!==null&&!Array.isArray(x)):[]}
export async function aiOutput(id:string):Promise<AiRecord>{return record(await apiRequest<unknown>(`/ai/outputs/${id}`))}
export const aiPost=(path:string,body:AiRecord={})=>apiRequest<AiRecord>(path,{method:"POST",body:JSON.stringify(body)});
