import type { LucideIcon } from "lucide-react"

import { Card, CardContent } from "@/components/ui/card"

type ActivitySummaryCardRow = {
  label: string
  value: string
}

type ActivitySummaryCardProps = {
  icon: LucideIcon
  title: string
  description: string
  rows: ActivitySummaryCardRow[]
  compact?: boolean
}

export function ActivitySummaryCard({
  icon: Icon,
  title,
  description,
  rows,
  compact = false,
}: ActivitySummaryCardProps) {
  return (
    <Card className="rounded-2xl border-border bg-card py-0 shadow-sm">
      <CardContent className="space-y-5 p-5 sm:p-6">
        <div className="flex items-start gap-4">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
            <Icon className="size-5" aria-hidden="true" />
          </div>
          <div className="space-y-1">
            <h2 className="text-xl font-semibold tracking-tight text-foreground">{title}</h2>
            <p className="text-sm leading-6 text-muted-foreground">{description}</p>
          </div>
        </div>

        <dl className="space-y-3 text-sm">
          {rows.map((row) => (
            <div
              key={row.label}
              className={compact
                ? "flex items-start justify-between gap-4 rounded-xl bg-muted/30 px-3 py-2"
                : "flex items-start justify-between gap-4 rounded-xl border border-border bg-background/30 px-4 py-3"}
            >
              <dt className="text-muted-foreground">{row.label}</dt>
              <dd className={compact ? "text-right font-medium text-foreground" : "max-w-[55%] text-right font-semibold text-foreground"}>
                {row.value}
              </dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  )
}
