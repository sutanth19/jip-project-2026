import { useState } from "react";
import { Link } from "react-router-dom";

import logoWeb from "@/assets/images/logo_web.svg";
import AuthBrandPanel from "@/components/auth/AuthBrandPanel";
import LoginForm from "@/components/auth/LoginForm";

export default function LoginPage() {
  const [activeUserType, setActiveUserType] = useState<"student" | "teacher" | "admin" | "parent">("student");

  return (
    <div className="grid min-h-dvh lg:h-dvh lg:grid-cols-[42%_58%] lg:overflow-hidden">
      <section className="flex min-h-dvh flex-col bg-background text-foreground lg:h-full lg:min-h-0 lg:overflow-y-auto">
        <div className="mx-auto flex min-h-full w-full max-w-[500px] flex-col px-4 py-6 sm:px-6 lg:px-8">
          <div className="pb-4 lg:hidden">
            <Link
              to="/"
              className="inline-flex items-center gap-4 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <img
                src={logoWeb}
                alt="DIGITAL MAIN-LiT"
                className="h-14 w-14 object-contain sm:h-16 sm:w-16"
              />
              <div className="leading-tight">
                <p className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                  DIGITAL MAIN-LiT
                </p>
                <p className="mt-1 text-sm font-medium text-muted-foreground sm:text-base">
                  Revolusi Literasi Bersepadu
                </p>
              </div>
            </Link>
          </div>

          <main className="flex flex-1 items-center justify-center py-4 sm:py-6 lg:min-h-0 lg:py-8">
            <LoginForm
              className="w-full"
              activeUserType={activeUserType}
              onActiveUserTypeChange={setActiveUserType}
            />
          </main>

        </div>
      </section>

      <AuthBrandPanel activeUserType={activeUserType} />
    </div>
  );
}
