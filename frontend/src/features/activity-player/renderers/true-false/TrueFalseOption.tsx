import { CheckCircle2, XCircle } from "lucide-react"

import { RadioGroupItem } from "@/components/ui/radio-group"
import { cn } from "@/lib/utils"

import type { TrueFalseOption as TrueFalseOptionModel } from "./true-false.types"

type TrueFalseOptionProps = {
  option: TrueFalseOptionModel
  selected: boolean
  disabled: boolean
  status: "neutral" | "correct" | "incorrect"
}

export function TrueFalseOption({ option, selected, disabled, status }: TrueFalseOptionProps) {
  const Icon = option.value ? CheckCircle2 : XCircle
  const optionDescription = `${option.displayLabel}. ${option.value ? "Pernyataan ini betul" : "Pernyataan ini salah"}.`

  return (
    <label className={cn(
      "group flex min-h-36 cursor-pointer items-center gap-4 rounded-2xl border-2 bg-card p-5 text-left shadow-sm transition-all motion-reduce:transition-none sm:min-h-44 sm:p-6",
      "has-[:focus-visible]:border-ring has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-ring/50",
      selected && "border-primary bg-primary/5",
      status === "correct" && "border-secondary bg-secondary/10",
      status === "incorrect" && "border-destructive bg-destructive/10",
      disabled && "cursor-default opacity-85",
    )}>
      <RadioGroupItem value={option.id} id={`true-false-${option.id}`} disabled={disabled} aria-label={optionDescription} className="size-6" />
      <Icon className={cn("size-10 shrink-0 sm:size-12", option.value ? "text-secondary" : "text-destructive")} aria-hidden="true" />
      <div className="min-w-0 space-y-1">
        <p className="text-xl font-bold tracking-wide sm:text-2xl">{option.displayLabel}</p>
        <p className="text-sm text-muted-foreground sm:text-base">{option.value ? "Pernyataan ini betul." : "Pernyataan ini salah."}</p>
        {status === "correct" ? <span className="text-sm font-semibold text-secondary">Jawapan betul</span> : null}
        {status === "incorrect" ? <span className="text-sm font-semibold text-destructive">Belum tepat</span> : null}
      </div>
    </label>
  )
}
