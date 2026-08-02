import type { ReactNode } from "react";
import { ChevronRight, House } from "lucide-react";
import { Link } from "react-router-dom";

import { cn } from "@/lib/utils";

export type ManagementPageBreadcrumbItem = {
  label: string;
  to?: string;
};

type ManagementPageLayoutProps = {
  breadcrumb: ManagementPageBreadcrumbItem[];
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  currentAccent?: "primary" | "secondary";
};

const accentClassNames = {
  primary: {
    text: "text-primary",
    ring: "focus-visible:ring-primary/30",
  },
  secondary: {
    text: "text-secondary",
    ring: "focus-visible:ring-secondary/30",
  },
} as const;

export function ManagementPageLayout({
  breadcrumb,
  title,
  description,
  actions,
  children,
  currentAccent = "primary",
}: ManagementPageLayoutProps) {
  const accent = accentClassNames[currentAccent];

  return (
    <div className="mx-auto w-full max-w-7xl bg-background px-4 pb-6 pt-5 sm:px-6 lg:px-8">
      <div className="space-y-3">
        <nav className="flex min-h-9 flex-wrap items-center gap-2 text-sm" aria-label="Breadcrumb">
          {breadcrumb.map((item, index) => {
            const isLast = index === breadcrumb.length - 1;
            const isHome = index === 0 && item.label === "Home";

            return (
              <span key={`${item.label}-${item.to ?? index}`} className="contents">
                {index > 0 ? <ChevronRight className="size-4 text-muted-foreground" aria-hidden="true" /> : null}
                {isLast || !item.to ? (
                  <span className={cn("font-semibold", accent.text)}>{item.label}</span>
                ) : (
                  <Link
                    to={item.to}
                    className={cn(
                      "inline-flex items-center gap-1 rounded-md text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2",
                      accent.ring
                    )}
                  >
                    {isHome ? <House className="size-4" aria-hidden="true" /> : null}
                    <span className={cn(isHome && "hidden sm:inline")}>{item.label}</span>
                  </Link>
                )}
              </span>
            );
          })}
        </nav>
        <div className="border-b border-border" />
      </div>

      <header className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">{title}</h1>
          {description ? <p className="mt-2 text-base text-muted-foreground">{description}</p> : null}
        </div>
        {actions ? <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">{actions}</div> : null}
      </header>

      <div className="mt-6">{children}</div>
    </div>
  );
}
