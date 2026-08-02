import * as React from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SectionCard } from "@/components/shared";
import { parseApiError } from "@/lib/api";

const phoneSchema = z.string().trim().optional().or(z.literal(""));

const adminAccountFormSchema = z.object({
  fullName: z.string().trim().min(3, "Nama penuh diperlukan."),
  email: z.string().trim().email("E-mel tidak sah."),
  phone: phoneSchema,
});

export type AdminAccountFormValues = z.infer<typeof adminAccountFormSchema>;

export function AdminAccountForm({
  defaultValues,
  submitLabel,
  cancelLabel,
  onCancel,
  onSubmit,
  infoText,
}: {
  defaultValues?: Partial<AdminAccountFormValues>;
  submitLabel: string;
  cancelLabel: string;
  onCancel: () => void;
  onSubmit: (values: AdminAccountFormValues) => Promise<void>;
  infoText?: string;
}) {
  const [serverError, setServerError] = React.useState<string | null>(null);
  const form = useForm<AdminAccountFormValues>({
    resolver: zodResolver(adminAccountFormSchema),
    defaultValues: {
      fullName: defaultValues?.fullName ?? "",
      email: defaultValues?.email ?? "",
      phone: defaultValues?.phone ?? "",
    },
  });

  const isDirty = form.formState.isDirty;
  React.useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!form.formState.isDirty) {
        return;
      }

      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [form.formState.isDirty]);

  const submit = form.handleSubmit(async (values) => {
    setServerError(null);
    try {
      await onSubmit(values);
    } catch (error) {
      const apiError = parseApiError(error);
      setServerError(apiError.message);
    }
  });

  return (
    <form className="space-y-6" onSubmit={submit}>
      {infoText ? (
        <SectionCard title="Maklumat Akaun" description={infoText}>
          <span className="sr-only">{infoText}</span>
        </SectionCard>
      ) : null}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="md:col-span-2">
          <Label htmlFor="fullName">Nama Penuh *</Label>
          <Input id="fullName" className="mt-2" {...form.register("fullName")} />
          {form.formState.errors.fullName ? <p className="mt-1 text-sm text-destructive">{form.formState.errors.fullName.message}</p> : null}
        </div>
        <div className="md:col-span-2">
          <Label htmlFor="email">E-mel *</Label>
          <Input id="email" type="email" className="mt-2" {...form.register("email")} />
          {form.formState.errors.email ? <p className="mt-1 text-sm text-destructive">{form.formState.errors.email.message}</p> : null}
        </div>
        <div className="md:col-span-2">
          <Label htmlFor="phone">Nombor Telefon</Label>
          <Input id="phone" className="mt-2" {...form.register("phone")} />
          {form.formState.errors.phone ? <p className="mt-1 text-sm text-destructive">{form.formState.errors.phone.message}</p> : null}
        </div>
      </div>
      {serverError ? <p className="text-sm text-destructive">{serverError}</p> : null}
      <div className="flex flex-wrap justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          {cancelLabel}
        </Button>
        <Button type="submit" disabled={form.formState.isSubmitting || !isDirty}>
          {form.formState.isSubmitting ? "Menyimpan..." : submitLabel}
        </Button>
      </div>
    </form>
  );
}
