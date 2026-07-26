"use client"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useTheme } from "@/components/theme-provider"
import { LaptopMinimal, MoonStar, SunMedium } from "lucide-react"

const themeOptions = [
  {
    value: "light",
    label: "Light",
    icon: <SunMedium className="size-4" />,
  },
  {
    value: "dark",
    label: "Dark",
    icon: <MoonStar className="size-4" />,
  },
  {
    value: "system",
    label: "System",
    icon: <LaptopMinimal className="size-4" />,
  },
] as const

export function DashboardThemeToggle() {
  const { theme, setTheme } = useTheme()

  const currentTheme = themeOptions.find((option) => option.value === theme)

  const handleThemeChange = (value: string) => {
    if (value === "light" || value === "dark" || value === "system") {
      setTheme(value)
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="size-8 shrink-0 border-border bg-background text-foreground shadow-none"
          aria-label="Tukar tema"
        >
          {currentTheme?.icon}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        <DropdownMenuRadioGroup value={theme} onValueChange={handleThemeChange}>
          {themeOptions.map((option) => (
            <DropdownMenuRadioItem key={option.value} value={option.value}>
              {option.icon}
              {option.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
