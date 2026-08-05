import { CheckCircle2, RotateCcw } from "lucide-react"

import { Card, CardContent } from "@/components/ui/card"

type ArrangeSyllablesFeedbackProps = {
  submitted: boolean
  isCorrect: boolean | null
  message: string | null
  explanation: string | null
  showExplanation: boolean
  showImmediateFeedback: boolean
}

export function ArrangeSyllablesFeedback({ submitted, isCorrect, message, explanation, showExplanation, showImmediateFeedback }: ArrangeSyllablesFeedbackProps) {
  if (!submitted || !showImmediateFeedback || !message) return null
  const correct = isCorrect === true
  return <Card aria-live="polite" className={correct ? "border-secondary/40 bg-secondary/10" : "border-primary/30 bg-primary/5"}><CardContent className="flex gap-3 p-4">{correct ? <CheckCircle2 className="size-6 shrink-0 text-secondary" aria-hidden="true" /> : <RotateCcw className="size-6 shrink-0 text-primary" aria-hidden="true" />}<div className="space-y-1"><p className="font-semibold">{message}</p>{correct && showExplanation && explanation ? <p className="text-sm leading-6 text-muted-foreground">{explanation}</p> : null}</div></CardContent></Card>
}
