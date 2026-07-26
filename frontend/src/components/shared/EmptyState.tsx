import { Card, CardContent } from "@/components/ui/card"

type EmptyStateProps = {
  icon?: React.ReactNode
  title: string
  description?: string
  action?: React.ReactNode
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <Card className="border-border/70 bg-card shadow-sm">
      <CardContent className="flex flex-col items-center gap-4 p-8 text-center sm:p-10">
        {icon ? (
          <div className="flex size-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
            {icon}
          </div>
        ) : null}
        <div className="max-w-md space-y-2">
          <h3 className="text-lg font-semibold text-foreground">{title}</h3>
          {description ? (
            <p className="text-sm leading-6 text-muted-foreground">
              {description}
            </p>
          ) : null}
        </div>
        {action ? <div className="pt-1">{action}</div> : null}
      </CardContent>
    </Card>
  )
}
