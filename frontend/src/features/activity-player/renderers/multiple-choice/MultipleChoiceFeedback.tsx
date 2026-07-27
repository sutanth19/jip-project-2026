import { CheckCircle2, Lightbulb, RotateCcw, XCircle } from "lucide-react"

import { Card, CardContent } from "@/components/ui/card"

type MultipleChoiceFeedbackProps = {
  submitted: boolean
  isCorrect: boolean | null
  message: string | null
  explanation: string | null
  showExplanation: boolean
  showImmediateFeedback: boolean
}

export function MultipleChoiceFeedback({ submitted, isCorrect, message, explanation, showExplanation, showImmediateFeedback }: MultipleChoiceFeedbackProps) {
  if (!submitted || !message) return null
  const isPositive = showImmediateFeedback && isCorrect === true
  const isNegative = showImmediateFeedback && isCorrect === false
  return (
    <Card className={isPositive ? "border-secondary/40 bg-secondary/10" : isNegative ? "border-primary/30 bg-primary/5" : "border-primary/20 bg-primary/5"} aria-live="polite">
      <CardContent className="flex gap-3 p-4"><div className="pt-0.5">{isPositive ? <CheckCircle2 className="size-6 text-secondary" aria-hidden="true" /> : isNegative ? <RotateCcw className="size-6 text-primary" aria-hidden="true" /> : <XCircle className="size-6 text-primary" aria-hidden="true" />}</div><div className="min-w-0 space-y-2"><p className="font-semibold">{message}</p>{showImmediateFeedback && showExplanation && explanation ? <p className="flex gap-2 text-sm leading-6 text-muted-foreground"><Lightbulb className="mt-1 size-4 shrink-0 text-primary" aria-hidden="true" />{explanation}</p> : null}</div></CardContent>
    </Card>
  )
}
