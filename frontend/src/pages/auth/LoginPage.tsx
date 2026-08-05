import { useState } from "react";
import { Link } from "react-router-dom";

import logoWeb from "@/assets/images/logo_web.svg";
import AuthBrandPanel from "@/components/auth/AuthBrandPanel";
import LoginForm, {
  type UserType,
} from "@/components/auth/LoginForm";

export default function LoginPage() {
  const [activeUserType, setActiveUserType] =
    useState<UserType>("admin");

  return (
    <div className="grid min-h-dvh lg:h-dvh lg:grid-cols-[42%_58%] lg:overflow-hidden">
      <section className="flex min-h-dvh flex-col bg-background text-foreground lg:h-full lg:min-h-0 lg:overflow-y-auto">
        <div className="mx-auto flex min-h-full w-full max-w-[500px] flex-col px-4 py-6 sm:px-6 lg:px-8">
          <div className="pb-4 lg:hidden">
            <Link
              to="/"
              className="inline-flex items-center gap-3 rounded-xl"
            >
              <img
                src={logoWeb}
                alt="LITERASI DIGITAL"
                className="h-10 w-10 object-contain sm:h-12 sm:w-12"
              />

              <div className="leading-tight">
                <p className="text-lg font-bold tracking-tight">
                  LITERASI DIGITAL
                </p>

                <p className="text-sm text-muted-foreground">
                  Kampus Darul Aman
                </p>
              </div>
            </Link>
          </div>

          <main className="flex flex-1 items-center justify-center py-4 sm:py-6 lg:py-8">
            <LoginForm
              className="w-full"
              userType={activeUserType}
              onUserTypeChange={setActiveUserType}
            />
          </main>

          <footer className="pt-4 text-left text-sm text-muted-foreground lg:hidden">
            © 2026 LITERASI DIGITAL Kampus Darul Aman
          </footer>
        </div>
      </section>

      <AuthBrandPanel userType={activeUserType} />
    </div>
  );
}