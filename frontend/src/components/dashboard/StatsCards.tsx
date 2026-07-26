import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  School,
  GraduationCap,
  Users,
  LibraryBig,
} from "lucide-react"

type Stat = {
  label: string
  value: string
  icon: React.ReactNode
  tone: string
}

const stats: Stat[] = [
  { label: "Sekolah", value: "18", icon: <School className="size-5" />, tone: "from-blue-500 to-blue-600" },
  { label: "Guru", value: "146", icon: <GraduationCap className="size-5" />, tone: "from-emerald-500 to-emerald-600" },
  { label: "Murid", value: "2,480", icon: <Users className="size-5" />, tone: "from-amber-500 to-amber-600" },
  { label: "Aktiviti Digital", value: "324", icon: <LibraryBig className="size-5" />, tone: "from-sky-500 to-cyan-600" },
]

export function StatsCards() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {stats.map((stat) => (
        <Card key={stat.label} className="border-border/70 bg-card shadow-sm">
          <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {stat.label}
            </CardTitle>
            <div className={`rounded-xl bg-gradient-to-br ${stat.tone} p-2 text-white`}>
              {stat.icon}
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold tracking-tight text-foreground">
              {stat.value}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">Nilai sementara</p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
