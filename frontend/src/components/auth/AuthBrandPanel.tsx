import adminLoginImage from "@/assets/images/login_admin.png";
import defaultLoginImage from "@/assets/images/login_default.png";
import studentLoginImage from "@/assets/images/login_img.png";
import parentLoginImage from "@/assets/images/login_parent.png";
import logoWeb from "@/assets/images/logo_web.svg";

import type { UserType } from "@/components/auth/LoginForm";

type AuthBrandPanelProps = {
  userType: UserType;
};

function getLoginImage(userType: UserType) {
  switch (userType) {
    case "student":
      return studentLoginImage;

    case "parent":
      return parentLoginImage;

    case "admin":
      return adminLoginImage;
      
    case "teacher":
    default:
      return defaultLoginImage;
  }
}

function getLoginImageAlt(userType: UserType) {
  switch (userType) {
    case "student":
      return "Ilustrasi log masuk murid LITERASI DIGITAL";

    case "parent":
      return "Ilustrasi log masuk ibu bapa LITERASI DIGITAL";

    case "teacher":
      return "Ilustrasi log masuk guru LITERASI DIGITAL";

    case "admin":
    default:
      return "Ilustrasi log masuk pentadbir LITERASI DIGITAL";
  }
}

export default function AuthBrandPanel({
  userType,
}: AuthBrandPanelProps) {
  console.log("Current User Type:", userType);

  const selectedLoginImage = getLoginImage(userType);
  const selectedImageAlt = getLoginImageAlt(userType);

  console.log("Selected Image:", selectedLoginImage);

  return (
    <aside className="relative hidden h-full overflow-hidden border-l border-border bg-muted/30 lg:flex lg:flex-col">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
      >
        <div className="absolute top-10 right-10 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-72 w-72 rounded-full bg-secondary/10 blur-3xl" />
      </div>

      <div className="relative flex h-full w-full flex-col">
        <header className="flex justify-center px-10 pt-8 lg:px-12 xl:px-16">
          <div className="flex items-center gap-4">
            <img
              src={logoWeb}
              alt="Logo LITERASI DIGITAL"
              className="h-14 w-14 object-contain"
            />

            <div className="text-center leading-tight">
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                LITERASI DIGITAL
              </h1>

              <p className="text-sm text-muted-foreground">
                Kampus Darul Aman
              </p>
            </div>
          </div>
        </header>

        <main className="flex min-h-0 flex-1 items-center justify-center px-8 pb-8">
          <img
            key={userType}
            src={selectedLoginImage}
            alt={selectedImageAlt}
            className="h-full max-h-[720px] w-full max-w-[920px] object-contain"
          />
        </main>

        <footer className="px-10 pb-6 text-center lg:px-12 xl:px-16">
          <p className="text-sm text-muted-foreground">
            © 2026 LITERASI DIGITAL Kampus Darul Aman
          </p>
        </footer>
      </div>
    </aside>
  );
}