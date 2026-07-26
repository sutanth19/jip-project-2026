import * as React from "react"

import { Link, useLocation } from "react-router-dom"

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { DashboardThemeToggle } from "@/components/dashboard/DashboardThemeToggle"

type BreadcrumbRoute = {
  path: string
  label: string
}

const breadcrumbRoutes: BreadcrumbRoute[] = [
  { path: "/dashboard", label: "Dashboard" },
  { path: "/dashboard/sekolah", label: "Pengurusan Sekolah" },
  { path: "/dashboard/guru", label: "Pengurusan Guru" },
  { path: "/dashboard/kurikulum", label: "Kurikulum Pemulihan" },
  {
    path: "/dashboard/kurikulum/mata-pelajaran",
    label: "Mata Pelajaran",
  },
  { path: "/dashboard/kurikulum/tahun", label: "Tahun" },
  {
    path: "/dashboard/kurikulum/kemahiran",
    label: "Kemahiran Pemulihan",
  },
  {
    path: "/dashboard/kurikulum/standard-kandungan",
    label: "Standard Kandungan",
  },
  {
    path: "/dashboard/kurikulum/standard-pembelajaran",
    label: "Standard Pembelajaran",
  },
  { path: "/dashboard/aktiviti", label: "Bank Aktiviti Digital" },
  { path: "/dashboard/jenis-aktiviti", label: "Jenis Aktiviti" },
  { path: "/dashboard/semakan", label: "Semakan & Penerbitan" },
  { path: "/dashboard/laporan", label: "Analitik & Laporan" },
  { path: "/dashboard/pengumuman", label: "Pengumuman" },
  { path: "/dashboard/tetapan", label: "Tetapan Sistem" },
]

function matchesPath(pathname: string, path: string) {
  return pathname === path || pathname.startsWith(`${path}/`)
}

function getBreadcrumbItems(pathname: string) {
  return breadcrumbRoutes
    .filter((item) => matchesPath(pathname, item.path))
    .sort((a, b) => a.path.length - b.path.length)
}

export function DashboardTopbar() {
  const { pathname } = useLocation()
  const breadcrumbItems = getBreadcrumbItems(pathname)
  const items = breadcrumbItems.length
    ? breadcrumbItems
    : [{ path: "/dashboard", label: "Dashboard" }]

  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-3 border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/80 sm:px-6 lg:px-8">
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <SidebarTrigger className="-ml-1 shrink-0" />
        <Separator
          orientation="vertical"
          className="hidden h-3 w-px shrink-0 opacity-40 sm:block"
        />
        <Breadcrumb className="min-w-0">
          <BreadcrumbList className="min-w-0">
            {items.map((item, index) => {
              const isLast = index === items.length - 1

              return (
                <React.Fragment key={item.path}>
                  {index > 0 ? <BreadcrumbSeparator /> : null}
                  <BreadcrumbItem>
                    {isLast ? (
                      <BreadcrumbPage>{item.label}</BreadcrumbPage>
                    ) : (
                      <BreadcrumbLink asChild>
                        <Link to={item.path}>{item.label}</Link>
                      </BreadcrumbLink>
                    )}
                  </BreadcrumbItem>
                </React.Fragment>
              )
            })}
          </BreadcrumbList>
        </Breadcrumb>
      </div>
      <div className="ml-auto flex shrink-0 items-center gap-2">
        <DashboardThemeToggle />
      </div>
    </header>
  )
}
