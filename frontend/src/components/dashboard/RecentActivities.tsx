import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

const activities = [
  { title: "Guru Matematik Tahun 2 memuat naik aktiviti baharu", meta: "5 minit lalu" },
  { title: "Semakan kurikulum untuk Bahasa Melayu Tahun 1 selesai", meta: "30 minit lalu" },
  { title: "Laporan mingguan sekolah dijana oleh pentadbir", meta: "1 jam lalu" },
  { title: "Aktiviti digital baharu ditandakan untuk penerbitan", meta: "3 jam lalu" },
]

export function RecentActivities() {
  return (
    <Card className="border-border/70 bg-card shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg text-foreground">Aktiviti Terkini</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {activities.map((activity) => (
          <div
            key={activity.title}
            className="rounded-xl border border-border bg-muted/30 p-4 transition-colors hover:bg-muted/50 dark:bg-muted/20 dark:hover:bg-muted/30"
          >
            <p className="text-sm font-medium text-foreground">{activity.title}</p>
            <p className="mt-1 text-xs text-muted-foreground">{activity.meta}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
