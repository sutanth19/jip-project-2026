import { Outlet } from "react-router-dom";

import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import PublicThemeSurface from "@/components/layout/PublicThemeSurface";

export default function PublicLayout() {
  return (
    <PublicThemeSurface>
      <div className="min-h-dvh bg-background text-foreground flex flex-col">
        <Navbar />

        <main className="flex-1">
          <Outlet />
        </main>

        <Footer />
      </div>
    </PublicThemeSurface>
  );
}
