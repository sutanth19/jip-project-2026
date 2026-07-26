import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export function ProgressChart() {
  return (
    <Card className="border-border/70 bg-card shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg text-foreground">
          Prestasi Mengikut Tahun
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex min-h-[280px] items-center justify-center rounded-2xl border border-dashed border-border bg-gradient-to-br from-blue-50 via-background to-emerald-50 p-6 text-center dark:from-blue-950/20 dark:via-card dark:to-emerald-950/20">
          <div className="max-w-md space-y-2">
            <p className="text-sm font-medium text-blue-700 dark:text-blue-300">
              Placeholder untuk integrasi carta akan datang
            </p>
            <p className="text-sm leading-6 text-muted-foreground">
              Ruang ini disediakan untuk visual prestasi murid, guru, atau sekolah
              mengikut tahun pembelajaran.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
