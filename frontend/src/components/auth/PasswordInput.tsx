import { useId, useState } from "react";

import { Eye, EyeOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type PasswordInputProps = Omit<
  React.ComponentProps<typeof Input>,
  "type" | "id"
> & {
  id: string;
  label?: string;
  description?: string;
  errorMessage?: string;
};

export default function PasswordInput({
  id,
  label = "Kata Laluan",
  description,
  errorMessage,
  className,
  ...props
}: PasswordInputProps) {
  const [isVisible, setIsVisible] = useState(false);
  const helperId = useId();
  const errorId = useId();
  const describedBy = [description ? helperId : null, errorMessage ? errorId : null]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="text-sm font-medium text-foreground">
        {label}
      </Label>

      <div className="relative">
        <Input
          id={id}
          type={isVisible ? "text" : "password"}
          autoComplete="current-password"
          aria-describedby={describedBy || undefined}
          aria-invalid={errorMessage ? true : undefined}
          className={cn("h-11 rounded-xl pr-11 sm:h-12", className)}
          {...props}
        />

        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={isVisible ? "Sembunyikan kata laluan" : "Tunjukkan kata laluan"}
          aria-pressed={isVisible}
          onClick={() => setIsVisible((current) => !current)}
          onMouseDown={(event) => event.preventDefault()}
          className="absolute top-1/2 right-2 h-8 w-8 -translate-y-1/2 rounded-lg border-0 bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          {isVisible ? <EyeOff className="size-4" aria-hidden="true" /> : <Eye className="size-4" aria-hidden="true" />}
        </Button>
      </div>

      {description ? (
        <p id={helperId} className="text-sm leading-6 text-muted-foreground">
          {description}
        </p>
      ) : null}

      {errorMessage ? (
        <p id={errorId} role="alert" className="text-sm text-destructive">
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
}
