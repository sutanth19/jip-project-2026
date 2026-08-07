"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

type MinimalToggleProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, "type">

const MinimalToggle = React.forwardRef<HTMLInputElement, MinimalToggleProps>(
  ({ className, disabled, ...props }, ref) => {
    return (
      <label
        className={cn(
          "relative inline-flex h-11 w-11 shrink-0 items-center justify-center",
          disabled && "cursor-not-allowed opacity-50",
        )}
      >
        <input
          ref={ref}
          type="checkbox"
          disabled={disabled}
          className="peer sr-only"
          {...props}
        />
        <span
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute h-[26px] w-[46px] rounded-full border border-border/80 bg-slate-300/90 transition-colors duration-200",
            "dark:bg-slate-700/85",
            "peer-checked:bg-secondary/90",
            "peer-focus-visible:ring-2 peer-focus-visible:ring-primary/30 peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-background",
            className,
          )}
        />
        <span
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute left-[3px] top-1/2 h-5 w-5 -translate-y-1/2 rounded-full border border-border/60 bg-background shadow-[0_2px_6px_rgba(15,23,42,0.18)] transition-transform duration-200 ease-out",
            "peer-checked:translate-x-5",
          )}
        />
      </label>
    )
  },
)

MinimalToggle.displayName = "MinimalToggle"

export { MinimalToggle }
