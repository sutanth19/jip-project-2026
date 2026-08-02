import { Outlet } from "react-router-dom"

import { DashboardTopbar } from "@/components/dashboard/DashboardTopbar"
import { AppSidebar } from "@/components/dashboard/Sidebar"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"

export function DashboardLayout() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="overflow-x-hidden bg-background">
        <DashboardTopbar />
        <section className="flex min-w-0 flex-1 flex-col overflow-x-hidden bg-background">
          <Outlet />
        </section>
      </SidebarInset>
    </SidebarProvider>
  )
}
