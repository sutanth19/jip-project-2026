import { DashboardHeader } from "@/components/dashboard/DashboardHeader"
import { StatsCards } from "@/components/dashboard/StatsCards"
import { ProgressChart } from "@/components/dashboard/ProgressChart"
import { ActivityStatus } from "@/components/dashboard/ActivityStatus"
import { RecentActivities } from "@/components/dashboard/RecentActivities"
import { QuickActions } from "@/components/dashboard/QuickActions"

export function DashboardPage() {
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-6 bg-background p-4 text-foreground sm:p-6 lg:p-8">
      <DashboardHeader
        title="Dashboard"
        subtitle={
          "Selamat Datang ke Digital Main-LiT\nSistem Pengurusan Literasi & Pemulihan Bahasa Melayu"
        }
      />
      <StatsCards />
      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <ProgressChart />
        <ActivityStatus />
      </div>
      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <RecentActivities />
        <QuickActions />
      </div>
    </div>
  )
}
