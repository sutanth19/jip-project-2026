import { Card, CardContent } from "@/components/ui/card"

type DashboardHeaderProps = {
  title: string
  subtitle: string
}

export function DashboardHeader({ title, subtitle }: DashboardHeaderProps) {
  return (
    <Card className="overflow-hidden border-border/70 bg-gradient-to-r from-blue-50 via-background to-emerald-50 shadow-sm dark:from-blue-950/20 dark:via-card dark:to-emerald-950/20">
      <CardContent className="flex flex-col gap-3 p-5 sm:p-6 lg:p-7">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-600 dark:text-blue-300 sm:text-sm">
          Digital Main-LiT
        </p>
        <div className="max-w-3xl space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            {title}
          </h1>
          <p className="whitespace-pre-line text-sm leading-6 text-muted-foreground sm:text-[15px] sm:leading-7">
            {subtitle}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
