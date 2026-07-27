import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  ArrowRight,
  GraduationCap,
  LibraryBig,
  PlusCircle,
  School,
} from "lucide-react"

const actions = [
  {
    label: "Tambah Sekolah",
    description: "Daftar sekolah baharu dalam sistem.",
    icon: <School className="size-5" />,
    accent: "border-blue-200 bg-blue-50 text-blue-600",
  },
  {
    label: "Tambah Guru",
    description: "Sediakan rekod guru dengan cepat.",
    icon: <GraduationCap className="size-5" />,
    accent: "border-emerald-200 bg-emerald-50 text-emerald-600",
  },
  {
    label: "Cipta Aktiviti",
    description: "Bangunkan aktiviti digital baharu.",
    icon: <PlusCircle className="size-5" />,
    accent: "border-amber-200 bg-amber-50 text-amber-600",
  },
  {
    label: "Jana Laporan",
    description: "Hasilkan ringkasan prestasi semasa.",
    icon: <LibraryBig className="size-5" />,
    accent: "border-sky-200 bg-sky-50 text-sky-600",
  },
]

export function QuickActions() {
  return (
    <Card className="border-border/70 bg-card shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg text-foreground">Tindakan Pantas</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {actions.map((action) => (
          <Card
            key={action.label}
            className="group border-border/70 bg-background/80 shadow-none transition-all duration-200 hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-sm dark:bg-card/80"
          >
            <CardContent className="flex h-full flex-col gap-4 p-5">
              <div className="flex items-start justify-between gap-3">
                <div
                  className={`inline-flex size-11 items-center justify-center rounded-2xl ring-1 ring-inset ${action.accent}`}
                >
                  {action.icon}
                </div>
                <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
                  Aksi
                </span>
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-foreground">
                  {action.label}
                </h3>
                <p className="text-sm leading-6 text-muted-foreground">
                  {action.description}
                </p>
              </div>
              <div className="mt-auto flex items-center gap-1 text-sm font-medium text-blue-600">
                Buka tindakan
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
              </div>
            </CardContent>
          </Card>
        ))}
      </CardContent>
    </Card>
  )
}
