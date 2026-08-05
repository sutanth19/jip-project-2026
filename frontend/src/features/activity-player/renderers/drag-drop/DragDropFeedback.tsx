import { CheckCircle2, RotateCcw } from "lucide-react"

import { Card, CardContent } from "@/components/ui/card"

type DragDropFeedbackProps = { submitted: boolean; isCorrect: boolean | null; message: string | null; showImmediateFeedback: boolean }

export function DragDropFeedback({ submitted, isCorrect, message, showImmediateFeedback }: DragDropFeedbackProps) {
  if (!submitted || !showImmediateFeedback || !message) return null
  return <Card aria-live="polite" className={isCorrect ? "border-secondary/40 bg-secondary/10" : "border-primary/30 bg-primary/5"}><CardContent className="flex gap-3 p-4">{isCorrect ? <CheckCircle2 className="size-6 shrink-0 text-secondary" aria-hidden="true" /> : <RotateCcw className="size-6 shrink-0 text-primary" aria-hidden="true" />}<p className="font-semibold">{message}</p></CardContent></Card>
}
