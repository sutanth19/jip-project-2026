import { CheckCircle2, RotateCcw, X } from "lucide-react"

import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

import type { FillBlankBlank } from "./fill-in-the-blank.types"

type FillBlankInputProps = {
  blank: FillBlankBlank
  answer: string
  active: boolean
  submitted: boolean
  showImmediateFeedback: boolean
  correctness: boolean | null | undefined
  invalid: boolean
  onChange: (value: string) => void
  onActivate: () => void
  onRemove: () => void
}

export function FillBlankInput({ blank, answer, active, submitted, showImmediateFeedback, correctness, invalid, onChange, onActivate, onRemove }: FillBlankInputProps) {
  const status = submitted && showImmediateFeedback ? correctness === true ? "correct" : correctness === false ? "incorrect" : "neutral" : "neutral"
  const inputId = `fill-blank-${blank.id}`
  const errorId = `${inputId}-error`
  if (blank.inputMode === "TYPING") {
    return <span className="inline-flex min-w-40 align-middle"><Input id={inputId} aria-label={`Jawapan untuk blank ${blank.id}`} aria-invalid={invalid || status === "incorrect"} aria-describedby={invalid ? errorId : undefined} disabled={submitted} value={answer} placeholder={blank.placeholder ?? "Taip jawapan"} onFocus={onActivate} onChange={(event) => onChange(event.target.value)} className={cn("h-11 min-w-40 text-base", status === "correct" && "border-secondary bg-secondary/10", status === "incorrect" && "border-destructive bg-destructive/10")} />{invalid ? <span id={errorId} className="sr-only">Sila isi jawapan.</span> : null}</span>
  }
  return <span className="inline-flex align-middle"><button id={inputId} type="button" aria-label={`Blank ${blank.id}${answer ? `, jawapan ${answer}` : ", belum diisi"}`} aria-pressed={active} aria-invalid={invalid || status === "incorrect"} aria-describedby={invalid ? errorId : undefined} disabled={submitted} onClick={() => answer ? onRemove() : onActivate()} className={cn("inline-flex min-h-11 min-w-40 items-center justify-between gap-2 rounded-lg border-2 bg-card px-3 text-left text-base font-semibold shadow-sm transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-default", active && "border-primary bg-primary/5", status === "correct" && "border-secondary bg-secondary/10", status === "incorrect" && "border-destructive bg-destructive/10", invalid && "border-destructive")}>{answer || blank.placeholder || "Pilih perkataan"}{status === "correct" ? <CheckCircle2 className="size-4 text-secondary" aria-hidden="true" /> : status === "incorrect" ? <X className="size-4 text-destructive" aria-hidden="true" /> : answer ? <RotateCcw className="size-4 text-muted-foreground" aria-hidden="true" /> : null}</button>{invalid ? <span id={errorId} className="sr-only">Sila isi jawapan.</span> : null}</span>
}
