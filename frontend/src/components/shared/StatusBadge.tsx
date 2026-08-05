import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { getStatusTone } from "@/utils/status";

type StatusBadgeProps = {
  status: string;
  label?: string;
};

const toneClasses = {
  default: "bg-muted text-muted-foreground",
  success: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-100",
  warning: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-100",
  danger: "bg-destructive/10 text-destructive",
  info: "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-100",
};

export function StatusBadge({ status, label }: StatusBadgeProps) {
  const tone = getStatusTone(status);

  return (
    <Badge className={cn("border-transparent", toneClasses[tone])}>
      {label ?? status.replaceAll("_", " ")}
    </Badge>
  );
}

