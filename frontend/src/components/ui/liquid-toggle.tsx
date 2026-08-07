import { cn } from "@/lib/utils";

type LiquidToggleVariant = "default" | "success" | "warning" | "danger";

type LiquidToggleProps = {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  id?: string;
  name?: string;
  className?: string;
  variant?: LiquidToggleVariant;
  "aria-label"?: string;
  "aria-labelledby"?: string;
};

const variantStyles: Record<LiquidToggleVariant, { track: string; thumb: string; glow: string; halo: string }> = {
  default: {
    track: "bg-slate-200/90 dark:bg-slate-700/80 data-[checked=true]:bg-primary/90",
    thumb: "bg-background dark:bg-slate-50 data-[checked=true]:translate-x-[1.125rem]",
    glow: "data-[checked=true]:shadow-[0_0_0_1px_rgba(255,255,255,0.12),0_10px_24px_rgba(37,99,235,0.26)]",
    halo: "bg-slate-400/25 dark:bg-slate-200/10 data-[checked=true]:bg-primary-foreground/20",
  },
  success: {
    track: "bg-slate-200/90 dark:bg-slate-700/80 data-[checked=true]:bg-secondary/90",
    thumb: "bg-background dark:bg-slate-50 data-[checked=true]:translate-x-[1.125rem]",
    glow: "data-[checked=true]:shadow-[0_0_0_1px_rgba(255,255,255,0.12),0_10px_24px_rgba(16,185,129,0.24)]",
    halo: "bg-slate-400/25 dark:bg-slate-200/10 data-[checked=true]:bg-secondary-foreground/20",
  },
  warning: {
    track: "bg-slate-200/90 dark:bg-slate-700/80 data-[checked=true]:bg-amber-500/85",
    thumb: "bg-background dark:bg-slate-50 data-[checked=true]:translate-x-[1.125rem]",
    glow: "data-[checked=true]:shadow-[0_0_0_1px_rgba(255,255,255,0.12),0_10px_24px_rgba(245,158,11,0.24)]",
    halo: "bg-slate-400/25 dark:bg-slate-200/10 data-[checked=true]:bg-amber-100/25",
  },
  danger: {
    track: "bg-slate-200/90 dark:bg-slate-700/80 data-[checked=true]:bg-destructive/90",
    thumb: "bg-background dark:bg-slate-50 data-[checked=true]:translate-x-[1.125rem]",
    glow: "data-[checked=true]:shadow-[0_0_0_1px_rgba(255,255,255,0.12),0_10px_24px_rgba(239,68,68,0.24)]",
    halo: "bg-slate-400/25 dark:bg-slate-200/10 data-[checked=true]:bg-destructive-foreground/20",
  },
};

export function LiquidToggle({
  checked,
  onCheckedChange,
  disabled = false,
  id,
  name,
  className,
  variant = "default",
  ...aria
}: LiquidToggleProps) {
  const styles = variantStyles[variant];

  return (
    <>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        data-checked={checked}
        disabled={disabled}
        id={id}
        name={name}
        onClick={() => onCheckedChange(!checked)}
        className={cn(
          "relative inline-flex h-11 w-11 shrink-0 items-start justify-end rounded-xl p-0 outline-none focus-visible:ring-2 focus-visible:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-50",
          "before:absolute before:left-1/2 before:top-1/2 before:h-[26px] before:w-[44px] before:-translate-x-1/2 before:-translate-y-1/2 before:rounded-full before:border before:border-border/80 before:transition-[background-color,box-shadow]",
          styles.track,
          styles.glow,
          className,
        )}
        {...aria}
      >
        <span
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute left-1/2 top-1/2 h-[22px] w-[40px] -translate-x-1/2 -translate-y-1/2 rounded-full transition-colors",
            styles.halo,
          )}
        />
        <span
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute left-[5px] top-1/2 block size-[18px] -translate-y-1/2 rounded-full border border-border/50 shadow-[0_2px_6px_rgba(15,23,42,0.16)] transition-transform duration-200 ease-out",
            styles.thumb,
          )}
        />
      </button>
    </>
  );
}
