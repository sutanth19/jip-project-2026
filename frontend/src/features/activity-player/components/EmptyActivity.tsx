import { ListX } from "lucide-react"

import { Card, CardContent } from "@/components/ui/card"

export function EmptyActivity() {
  return <Card><CardContent className="flex min-h-64 flex-col items-center justify-center gap-3 p-8 text-center"><ListX className="size-10 text-muted-foreground" aria-hidden="true" /><div><h2 className="font-semibold">Tiada item aktiviti</h2><p className="mt-1 text-sm text-muted-foreground">Aktiviti ini belum mempunyai item untuk dimainkan.</p></div></CardContent></Card>
}
