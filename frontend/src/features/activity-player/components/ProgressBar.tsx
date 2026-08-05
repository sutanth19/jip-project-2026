import { cn } from "@/lib/utils"
import { Progress } from "@/components/ui/progress"

type ProgressBarProps = { value: number; label?: string; className?: string }

export function ProgressBar({ value, label, className }: ProgressBarProps) {
  const percentage = Math.min(Math.max(value, 0), 100)
  return (
    <div className={cn("space-y-1.5", className)}>
      {label ? <p className="text-xs font-medium text-muted-foreground">{label}</p> : null}
      <Progress value={percentage} className="h-3" aria-label={label ?? "Kemajuan aktiviti"} />
    </div>
  )
}
