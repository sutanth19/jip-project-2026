import adminLoginImage from "@/assets/images/admin_login.jpg";
import parentLoginImage from "@/assets/images/ibu_bapa_login.jpg";
import studentLoginImage from "@/assets/images/login_img.png";
import teacherLoginImage from "@/assets/images/guru_login.jpg";
import logoWeb from "@/assets/images/logo_web.svg";

type AuthBrandPanelProps = {
  activeUserType: "student" | "teacher" | "admin" | "parent";
};

const loginImages = {
  student: studentLoginImage,
  teacher: teacherLoginImage,
  admin: adminLoginImage,
  parent: parentLoginImage,
} as const;

export default function AuthBrandPanel({ activeUserType }: AuthBrandPanelProps) {
  const loginImage = loginImages[activeUserType];

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
              alt="Logo Digital Main-LiT"
              className="h-14 w-14 object-contain"
            />
            <div className="text-center leading-tight">
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                Digital Main-LiT
              </h1>
              <p className="text-sm text-muted-foreground">Kampus Darul Aman</p>
            </div>
          </div>
        </header>

        <main className="flex min-h-0 flex-1 items-center justify-center px-8 pb-8">
          <img
            src={loginImage}
            alt="Ilustrasi log masuk Digital Main-LiT"
            className="h-full max-h-[720px] w-full max-w-[920px] object-contain"
          />
        </main>

        <footer className="px-10 pb-6 text-center lg:px-12 xl:px-16">
          <p className="text-sm text-muted-foreground">
            © 2026 Digital Main-LiT Kampus Darul Aman
          </p>
        </footer>
      </div>
    </aside>
  );
}
