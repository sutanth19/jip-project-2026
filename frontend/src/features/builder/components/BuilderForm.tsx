import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { BuilderEntityConfig, BuilderField } from "@/features/builder/types/builder.types";
import { parseApiError } from "@/lib/api";

function fieldSchema(field: BuilderField) {
  if (field.type === "checkbox") {
    return z.boolean().optional();
  }

  const base = z.string().trim();
  return field.required ? base.min(1, `${field.label} diperlukan.`) : base.optional();
}

function configSchema(config: BuilderEntityConfig) {
  return z.object(Object.fromEntries((config.fields ?? []).map((field) => [field.name, fieldSchema(field)])));
}

export function BuilderForm({
  config,
  defaultValues,
  submitLabel,
  onSubmit,
}: {
  config: BuilderEntityConfig;
  defaultValues?: Record<string, unknown>;
  submitLabel: string;
  onSubmit: (values: Record<string, unknown>) => Promise<void>;
}) {
  const schema = React.useMemo(() => configSchema(config), [config]);
  const [serverError, setServerError] = React.useState<string | null>(null);
  const form = useForm<Record<string, string | boolean | undefined>>({
    resolver: zodResolver(schema),
    defaultValues: Object.fromEntries(
      (config.fields ?? []).map((field) => {
        const value = defaultValues?.[field.name];
        return [field.name, typeof value === "boolean" ? value : typeof value === "string" || typeof value === "number" ? String(value) : ""];
      }),
    ),
  });

  const submit = form.handleSubmit(async (values) => {
    setServerError(null);
    const cleaned = Object.fromEntries(Object.entries(values).filter(([, value]) => value !== undefined && value !== ""));
    const normalized =
      config.key === "digitalActivities"
        ? { ...cleaned, configuration: {}, shuffleItems: false, showImmediateFeedback: false, allowRetry: true }
        : cleaned;

    try {
      await onSubmit(normalized);
    } catch (error) {
      setServerError(parseApiError(error).message);
    }
  });

  return (
    <form className="space-y-5" onSubmit={submit}>
      <div className="grid gap-4 md:grid-cols-2">
        {(config.fields ?? []).map((field) => {
          const error = form.formState.errors[field.name]?.message;
          return (
            <div key={field.name} className={field.type === "textarea" ? "md:col-span-2" : undefined}>
              <Label htmlFor={field.name}>{field.label}</Label>
              {field.type === "textarea" ? (
                <textarea id={field.name} className="mt-2 min-h-28 w-full rounded-lg border bg-background px-3 py-2 text-sm" {...form.register(field.name)} />
              ) : field.type === "select" ? (
                <select id={field.name} className="mt-2 h-9 w-full rounded-lg border bg-background px-3 text-sm" {...form.register(field.name)}>
                  <option value="">Pilih</option>
                  {field.options?.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              ) : (
                <Input id={field.name} type={field.type ?? "text"} className="mt-2" {...form.register(field.name)} />
              )}
              {typeof error === "string" ? <p className="mt-1 text-sm text-destructive">{error}</p> : null}
            </div>
          );
        })}
      </div>
      {serverError ? <p className="text-sm text-destructive">{serverError}</p> : null}
      <Button type="submit" disabled={form.formState.isSubmitting}>
        {form.formState.isSubmitting ? "Menyimpan..." : submitLabel}
      </Button>
    </form>
  );
}
