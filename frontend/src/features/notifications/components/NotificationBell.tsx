import { Link } from "react-router-dom";
import { Bell } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { notifications } from "@/features/notifications/api/notifications.api";
export function NotificationBell(){const q=useQuery({queryKey:["notifications","bell"],queryFn:()=>notifications("?limit=5"),staleTime:60_000});const count=q.data?.unreadCount??0;return <Button asChild type="button" variant="outline" size="icon" aria-label={count?`${count} notifikasi belum dibaca`:"Tiada notifikasi belum dibaca"}><Link to="/notifikasi" className="relative"><Bell className="size-4" aria-hidden="true"/>{count?<span className="absolute -right-1 -top-1 grid min-w-4 place-items-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-white">{count}</span>:null}</Link></Button>}
