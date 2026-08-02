import { CheckCircle2, RotateCcw } from "lucide-react"

import { Card, CardContent } from "@/components/ui/card"

type MatchingFeedbackProps = { submitted: boolean; isCorrect: boolean | null; message: string | null; explanation: string | null; showExplanation: boolean; showImmediateFeedback: boolean }

export function MatchingFeedback({ submitted, isCorrect, message, explanation, showExplanation, showImmediateFeedback }: MatchingFeedbackProps) {
  if (!submitted || !showImmediateFeedback || !message) return null
  const positive = isCorrect === true
  return <Card aria-live="polite" className={positive ? "border-secondary/40 bg-secondary/10" : "border-primary/30 bg-primary/5"}><CardContent className="flex gap-3 p-4"><div className="pt-0.5">{positive ? <CheckCircle2 className="size-6 text-secondary" aria-hidden="true" /> : <RotateCcw className="size-6 text-primary" aria-hidden="true" />}</div><div className="space-y-1"><p className="font-semibold">{message}</p>{positive && showExplanation && explanation ? <p className="text-sm leading-6 text-muted-foreground">{explanation}</p> : null}</div></CardContent></Card>
}
