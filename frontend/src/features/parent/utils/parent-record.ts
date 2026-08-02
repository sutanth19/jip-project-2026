import type { ParentRecord } from "@/features/parent/types/parent.types";
export const isParentRecord=(v:unknown):v is ParentRecord=>typeof v==="object"&&v!==null&&!Array.isArray(v);
export const parentText=(v:unknown):string=>typeof v==="string"||typeof v==="number"?String(v):"—";
const blocked=/password|pin|token|secret|hash|correctanswer|acceptableanswer|iscorrect|internalnotes|audit|path|key$/i;
export const parentSafeEntries=(r:ParentRecord)=>Object.entries(r).filter(([k])=>!blocked.test(k));
export const parentList=(p:unknown,key:string):ParentRecord[]=>isParentRecord(p)&&Array.isArray(p[key])?p[key].filter(isParentRecord):[];
