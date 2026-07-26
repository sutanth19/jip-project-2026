import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

const statuses = [
  {
    label: "Draf",
    count: "12",
    tone: "border-slate-200 bg-slate-50 text-slate-700",
    description: "Menunggu semakan dalaman",
  },
  {
    label: "Dalam Semakan",
    count: "7",
    tone: "border-amber-200 bg-amber-50 text-amber-800",
    description: "Sedang diteliti oleh pentadbir",
  },
  {
    label: "Diluluskan",
    count: "18",
    tone: "border-emerald-200 bg-emerald-50 text-emerald-800",
    description: "Lulus untuk penerbitan",
  },
  {
    label: "Diterbitkan",
    count: "31",
    tone: "border-blue-200 bg-blue-50 text-blue-800",
    description: "Aktif di bank pembelajaran",
  },
]

export function ActivityStatus() {
  return (
    <Card className="border-border/70 bg-card shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg text-foreground">Status Aktiviti</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {statuses.map((status) => (
          <div
            key={status.label}
            className="flex items-center justify-between gap-3 rounded-xl border border-border bg-muted/30 p-4 dark:bg-muted/20"
          >
            <div className="min-w-0 space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-foreground">
                  {status.label}
                </span>
                <Badge className={`${status.tone} border px-2 py-0.5 text-xs font-semibold`}>
                  {status.count}
                </Badge>
              </div>
              <p className="text-xs leading-5 text-muted-foreground">
                {status.description}
              </p>
            </div>
            <div className={`size-2.5 shrink-0 rounded-full ${status.count === "31" ? "bg-blue-500" : status.count === "18" ? "bg-emerald-500" : status.count === "7" ? "bg-amber-500" : "bg-slate-400"}`} />
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
