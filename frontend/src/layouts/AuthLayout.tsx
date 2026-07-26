import { Outlet } from "react-router-dom"

import PublicThemeSurface from "@/components/layout/PublicThemeSurface"

export default function AuthLayout() {
  return (
    <PublicThemeSurface>
      <div className="bg-background text-foreground">
        <main className="w-full">
          <Outlet />
        </main>
      </div>
    </PublicThemeSurface>
  )
}
