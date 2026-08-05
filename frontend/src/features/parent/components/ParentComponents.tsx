import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/StatusBadge";
import type { ParentRecord } from "@/features/parent/types/parent.types";
import { parentText } from "@/features/parent/utils/parent-record";
export function ParentMetrics({items}:{items:{label:string;value:unknown}[]}){return <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{items.map(i=><Card key={i.label}><CardHeader className="pb-2"><CardDescription>{i.label}</CardDescription><CardTitle className="text-2xl">{parentText(i.value)}</CardTitle></CardHeader></Card>)}</div>}
export function ParentCards({rows,childId,kind}:{rows:ParentRecord[];childId:string;kind:string}){return <div className="grid gap-4 md:grid-cols-2">{rows.map((row,i)=><Card key={parentText(row.id??i)}><CardHeader><CardTitle className="text-base">{parentText(row.title??row.assignmentTitle??row.activityTitle??row.id)}</CardTitle><CardDescription>{parentText(row.submittedAt??row.assessedAt??row.dueAt??row.createdAt)}</CardDescription></CardHeader><CardContent className="flex items-center justify-between">{typeof row.status==="string"?<StatusBadge status={row.status}/>:<span/>}{kind==="assignments"?<Button size="sm" asChild><Link to={`/ibu-bapa/anak/${childId}`}>Lihat anak</Link></Button>:null}</CardContent></Card>)}</div>}
