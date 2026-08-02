import { useQuery } from "@tanstack/react-query";
import { parentChildList, parentDashboard, parentListApi, parentProfile, parentProgress, parentReport } from "@/features/parent/api/parent.api";
import type { ParentResource } from "@/features/parent/types/parent.types";
export const useParentDashboard=()=>useQuery({queryKey:["parent","dashboard"],queryFn:parentDashboard,staleTime:30_000});
export const useParentChildList=(kind:ParentResource,id:string)=>useQuery({queryKey:["parent",kind,id],queryFn:()=>parentChildList(kind,id),enabled:Boolean(id),staleTime:30_000});
export const useParentProgress=(id:string)=>useQuery({queryKey:["parent","progress",id],queryFn:()=>parentProgress(id),enabled:Boolean(id),staleTime:30_000});
export const useParentReport=(id:string)=>useQuery({queryKey:["parent","report",id],queryFn:()=>parentReport(id),enabled:Boolean(id),staleTime:30_000});
export const useParentList=(path:string,key:string)=>useQuery({queryKey:["parent",path],queryFn:()=>parentListApi(path,key),staleTime:30_000});
export const useParentProfile=()=>useQuery({queryKey:["parent","profile"],queryFn:parentProfile,staleTime:30_000});
