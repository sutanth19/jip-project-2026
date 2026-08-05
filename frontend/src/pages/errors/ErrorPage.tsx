import { Link } from "react-router-dom";
import { AlertTriangle, Home, RefreshCcw, WifiOff } from "lucide-react";

import { Button } from "@/components/ui/button";

type ErrorPageProps = {
  code: "401" | "403" | "404" | "500" | "offline";
  title: string;
  description: string;
};

const icons = {
  "401": AlertTriangle,
  "403": AlertTriangle,
  "404": AlertTriangle,
  "500": RefreshCcw,
  offline: WifiOff,
};

export function ErrorPage({ code, title, description }: ErrorPageProps) {
  const Icon = icons[code];

  return (
    <main className="grid min-h-dvh place-items-center bg-background px-4 py-10 text-foreground">
      <section className="w-full max-w-md text-center">
        <div className="mx-auto grid size-12 place-items-center rounded-full border bg-muted">
          <Icon className="size-5 text-muted-foreground" aria-hidden="true" />
        </div>
        <p className="mt-6 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          {code === "offline" ? "Offline" : code}
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">{description}</p>
        <div className="mt-6 flex justify-center gap-2">
          <Button asChild>
            <Link to="/">
              <Home className="size-4" aria-hidden="true" />
              Dashboard
            </Link>
          </Button>
          {code === "500" || code === "offline" ? (
            <Button type="button" variant="outline" onClick={() => window.location.reload()}>
              <RefreshCcw className="size-4" aria-hidden="true" />
              Cuba lagi
            </Button>
          ) : null}
        </div>
      </section>
    </main>
  );
}

export function UnauthorizedPage() {
  return (
    <ErrorPage
      code="401"
      title="Sesi diperlukan"
      description="Sila log masuk untuk meneruskan."
    />
  );
}

export function AccessDeniedPage() {
  return (
    <ErrorPage
      code="403"
      title="Akses ditolak"
      description="Akaun anda tidak mempunyai kebenaran untuk membuka halaman ini."
    />
  );
}

export function NotFoundPage() {
  return (
    <ErrorPage
      code="404"
      title="Halaman tidak ditemui"
      description="Alamat ini tidak wujud atau telah dipindahkan."
    />
  );
}

export function ServerErrorPage() {
  return (
    <ErrorPage
      code="500"
      title="Ralat pelayan"
      description="Sesuatu tidak berjalan seperti biasa. Sila cuba semula."
    />
  );
}

export function OfflinePage() {
  return (
    <ErrorPage
      code="offline"
      title="Anda sedang offline"
      description="Semak sambungan internet sebelum memuat semula halaman."
    />
  );
}
