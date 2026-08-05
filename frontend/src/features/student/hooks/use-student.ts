import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { assignmentDelivery, studentDashboard, studentDetail, studentList, studentPost } from "@/features/student/api/student.api";
import type { StudentRecord, StudentResource } from "@/features/student/types/student.types";
export const studentKeys={all:["student"] as const,list:(r:StudentResource,q:Record<string,string|number|boolean|undefined>)=>["student",r,q] as const,detail:(r:string,id:string)=>["student",r,id] as const};
export const useStudentDashboard=()=>useQuery({queryKey:["student","dashboard"],queryFn:studentDashboard,staleTime:30_000});
export const useStudentList=(r:StudentResource,q:Record<string,string|number|boolean|undefined>={})=>useQuery({queryKey:studentKeys.list(r,q),queryFn:()=>studentList(r,q),staleTime:30_000});
export const useStudentDetail=(r:Exclude<StudentResource,"notifications"|"announcements">,id:string)=>useQuery({queryKey:studentKeys.detail(r,id),queryFn:()=>studentDetail(r,id),enabled:Boolean(id),staleTime:30_000});
export const useDelivery=(id:string)=>useQuery({queryKey:["student","delivery",id],queryFn:()=>assignmentDelivery(id),enabled:Boolean(id),retry:false});
export function useStudentPost(){const c=useQueryClient();return useMutation({mutationFn:({path,body}:{path:string;body?:StudentRecord})=>studentPost(path,body),onSuccess:()=>void c.invalidateQueries({queryKey:studentKeys.all})});}
