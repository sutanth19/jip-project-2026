import { useId, useState } from "react";

import { Check, Eye, EyeOff, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getPasswordRequirementStatus, getPasswordStrength } from "@/lib/password-policy";
import { cn } from "@/lib/utils";

type PasswordStrengthInputProps = {
  id: string;
  name: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  error?: string;
  disabled?: boolean;
  autoComplete?: string;
  describedBy?: string;
};

export function PasswordStrengthInput({
  id,
  name,
  label,
  value,
  onChange,
  onBlur,
  error,
  disabled,
  autoComplete = "new-password",
  describedBy,
}: PasswordStrengthInputProps) {
  const [isVisible, setIsVisible] = useState(false);
  const helperId = useId();
  const errorId = useId();
  const requirements = getPasswordRequirementStatus(value);
  const strength = getPasswordStrength(value);
  const describedByIds = [helperId, describedBy, error ? errorId : null]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Label htmlFor={id} className="text-sm font-semibold text-foreground">
          {label}
        </Label>
        <div className="relative">
          <Input
            id={id}
            name={name}
            type={isVisible ? "text" : "password"}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            onBlur={onBlur}
            autoComplete={autoComplete}
            disabled={disabled}
            aria-invalid={error ? true : undefined}
            aria-describedby={describedByIds}
            className="h-12 rounded-xl pr-12 text-base"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={isVisible ? "Sembunyikan kata laluan" : "Tunjukkan kata laluan"}
            aria-pressed={isVisible}
            disabled={disabled}
            onClick={() => setIsVisible((current) => !current)}
            onMouseDown={(event) => event.preventDefault()}
            className="absolute right-2 top-1/2 h-8 w-8 -translate-y-1/2 rounded-lg border-0 bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            {isVisible ? <EyeOff className="size-4" aria-hidden="true" /> : <Eye className="size-4" aria-hidden="true" />}
          </Button>
        </div>
      </div>

      <div id={helperId} className="space-y-3">
        <div className="space-y-2" role="status" aria-live="polite">
          <div className="flex items-center justify-between gap-3 text-xs font-medium text-muted-foreground">
            <span>Kekuatan kata laluan</span>
            <span>{strength.label}</span>
          </div>
          <div className="grid grid-cols-5 gap-1.5" aria-hidden="true">
            {Array.from({ length: 5 }).map((_, index) => (
              <span
                key={index}
                className={cn(
                  "h-2 rounded-full bg-muted",
                  index < strength.score && "bg-primary",
                  index < strength.score && strength.score <= 2 && "bg-destructive",
                  index < strength.score && strength.score === 3 && "bg-accent",
                  index < strength.score && strength.score >= 4 && "bg-secondary",
                )}
              />
            ))}
          </div>
        </div>

        <ul className="grid gap-2 text-sm text-muted-foreground">
          {requirements.map((requirement) => (
            <li key={requirement.id} className="flex items-start gap-2">
              <span
                className={cn(
                  "mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full border",
                  requirement.met
                    ? "border-secondary/40 bg-secondary/10 text-secondary"
                    : "border-border bg-muted text-muted-foreground",
                )}
              >
                {requirement.met ? <Check className="size-3.5" aria-hidden="true" /> : <X className="size-3.5" aria-hidden="true" />}
              </span>
              <span className={requirement.met ? "text-foreground" : undefined}>{requirement.label}</span>
            </li>
          ))}
        </ul>
      </div>

      {error ? (
        <p id={errorId} role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
