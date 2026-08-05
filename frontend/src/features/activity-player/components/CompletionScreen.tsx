import { PartyPopper, RotateCcw } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

import { useActivityPlayer } from "../useActivityPlayer"

type CompletionScreenProps = { onExit: () => void }

export function CompletionScreen({ onExit }: CompletionScreenProps) {
  const { progress, completionSummary, restartActivity } = useActivityPlayer()
  return (
    <Card className="mx-auto w-full max-w-xl border-primary/20 bg-primary/5">
      <CardContent className="flex flex-col items-center gap-5 p-8 text-center sm:p-12">
        <div className="flex size-16 animate-pulse items-center justify-center rounded-full bg-primary text-primary-foreground"><PartyPopper className="size-8" aria-hidden="true" /></div>
        <div className="space-y-2"><h2 className="text-2xl font-bold">Aktiviti selesai!</h2><p className="text-muted-foreground">Anda telah melengkapkan {progress.completed} daripada {progress.total} item.</p>{completionSummary ? <div className="grid grid-cols-2 gap-2 pt-2 text-left text-sm"><p className="rounded-lg bg-background/70 p-2"><span className="block text-muted-foreground">Selesai</span><strong>{completionSummary.completedQuestions}/{completionSummary.totalQuestions}</strong></p><p className="rounded-lg bg-background/70 p-2"><span className="block text-muted-foreground">Betul</span><strong>{completionSummary.correctQuestions}</strong></p><p className="rounded-lg bg-background/70 p-2"><span className="block text-muted-foreground">Belum tepat</span><strong>{completionSummary.incorrectQuestions}</strong></p><p className="rounded-lg bg-background/70 p-2"><span className="block text-muted-foreground">Percubaan</span><strong>{completionSummary.totalAttempts}</strong></p><p className="col-span-2 rounded-lg bg-background/70 p-2"><span className="block text-muted-foreground">Status</span><strong>Pratonton sesi sahaja</strong></p></div> : null}</div>
        <div className="flex flex-wrap justify-center gap-3"><Button type="button" variant="outline" className="h-11" onClick={restartActivity}><RotateCcw /> Ulang aktiviti</Button><Button type="button" className="h-11" onClick={onExit}>Keluar</Button></div>
      </CardContent>
    </Card>
  )
}
