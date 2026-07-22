import logo from "@/assets/images/logo.svg";

type LogoProps = {
  showText?: boolean;
  size?: "sm" | "md" | "lg";
};

export default function Logo({ showText = true }: LogoProps) {
  return (
    <div className="flex items-center gap-4">
      <img
        src={logo}
        alt="Literasi Digital Kampus Darul Aman logo"
        className="h-14 w-14 object-contain"
      />

      {showText && (
        <div className="leading-tight">
          <h1 className="text-xl font-bold tracking-wide text-[var(--text)]">
            LITERASI DIGITAL
          </h1>

          <p className="text-sm text-slate-500">Kampus Darul Aman</p>
        </div>
      )}
    </div>
  );
}
