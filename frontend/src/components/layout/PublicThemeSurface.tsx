import type { CSSProperties, ReactNode } from "react"

type PublicThemeSurfaceProps = {
  children: ReactNode
  className?: string
}

const publicLightThemeVars: CSSProperties & Record<`--${string}`, string> = {
  "--background": "#f8fafc",
  "--foreground": "#1e293b",
  "--card": "#ffffff",
  "--card-foreground": "#1e293b",
  "--popover": "#ffffff",
  "--popover-foreground": "#1e293b",
  "--primary": "#2563eb",
  "--primary-foreground": "oklch(0.985 0 0)",
  "--secondary": "#10b981",
  "--secondary-foreground": "#ffffff",
  "--muted": "#f1f5f9",
  "--muted-foreground": "#475569",
  "--accent": "#f59e0b",
  "--accent-foreground": "#ffffff",
  "--destructive": "oklch(0.577 0.245 27.325)",
  "--border": "#e2e8f0",
  "--input": "#e2e8f0",
  "--ring": "oklch(0.708 0 0)",
  colorScheme: "light",
}

export default function PublicThemeSurface({
  children,
  className = "",
}: PublicThemeSurfaceProps) {
  return (
    <div
      className={`bg-background text-foreground ${className}`}
      style={publicLightThemeVars}
    >
      {children}
    </div>
  )
}
