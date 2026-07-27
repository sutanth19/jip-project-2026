import { RefreshCw, TriangleAlert } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

type ErrorStateProps = { message: string; onRetry: () => void; onExit: () => void }

export function ActivityErrorState({ message, onRetry, onExit }: ErrorStateProps) {
  return <main className="mx-auto flex min-h-dvh w-full max-w-2xl items-center p-4"><Card className="w-full"><CardContent className="flex flex-col items-center gap-4 p-8 text-center"><TriangleAlert className="size-10 text-destructive" aria-hidden="true" /><div><h1 className="text-xl font-bold">Aktiviti tidak dapat dibuka</h1><p className="mt-2 text-sm text-muted-foreground">{message}</p></div><div className="flex gap-3"><Button type="button" variant="outline" onClick={onExit}>Keluar</Button><Button type="button" onClick={onRetry}><RefreshCw /> Cuba semula</Button></div></CardContent></Card></main>
}
