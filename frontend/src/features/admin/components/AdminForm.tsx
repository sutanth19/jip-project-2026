import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { AdminEntityConfig, AdminField } from "@/features/admin/types/admin.types";
import { parseApiError } from "@/lib/api";

function schemaForField(field: AdminField) {
  const base = z.string().trim();

  if (field.required) {
    return base.min(1, `${field.label} diperlukan.`);
  }

  return base.optional();
}

function buildSchema(config: AdminEntityConfig) {
  const shape = Object.fromEntries((config.fields ?? []).map((field) => [field.name, schemaForField(field)]));
  return z.object(shape);
}

type AdminFormProps = {
  config: AdminEntityConfig;
  defaultValues?: Record<string, unknown>;
  submitLabel: string;
  onSubmit: (values: Record<string, unknown>) => Promise<void>;
};

export function AdminForm({ config, defaultValues, submitLabel, onSubmit }: AdminFormProps) {
  const schema = React.useMemo(() => buildSchema(config), [config]);
  const [serverError, setServerError] = React.useState<string | null>(null);
  const form = useForm<Record<string, string | undefined>>({
    resolver: zodResolver(schema),
    defaultValues: Object.fromEntries(
      (config.fields ?? []).map((field) => {
        const value = defaultValues?.[field.name];
        return [field.name, typeof value === "string" || typeof value === "number" ? String(value) : ""];
      }),
    ),
  });

  const submit = form.handleSubmit(async (values) => {
    setServerError(null);
    const cleaned = Object.fromEntries(
      Object.entries(values).filter(([, value]) => value !== undefined && value !== ""),
    );

    try {
      await onSubmit(cleaned);
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
                <textarea
                  id={field.name}
                  className="mt-2 min-h-24 w-full rounded-lg border bg-background px-3 py-2 text-sm"
                  placeholder={field.placeholder}
                  {...form.register(field.name)}
                />
              ) : field.type === "select" ? (
                <select
                  id={field.name}
                  className="mt-2 h-9 w-full rounded-lg border bg-background px-3 text-sm"
                  {...form.register(field.name)}
                >
                  <option value="">Pilih</option>
                  {field.options?.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              ) : (
                <Input
                  id={field.name}
                  type={field.type ?? "text"}
                  className="mt-2"
                  placeholder={field.placeholder}
                  {...form.register(field.name)}
                />
              )}
              {typeof error === "string" ? (
                <p className="mt-1 text-sm text-destructive">{error}</p>
              ) : null}
            </div>
          );
        })}
      </div>
      {serverError ? <p className="text-sm text-destructive">{serverError}</p> : null}
      <div className="flex justify-end gap-2">
        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? "Menyimpan..." : submitLabel}
        </Button>
      </div>
    </form>
  );
}

