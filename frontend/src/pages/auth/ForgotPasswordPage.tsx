import { useEffect, useId, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { zodResolver } from "@hookform/resolvers/zod";
import { GraduationCap, LoaderCircle, Mail, ShieldCheck } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { parseApiError } from "@/lib/api";
import { requestPasswordReset } from "@/services/auth.service";

const forgotPasswordSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Sila masukkan e-mel.")
    .pipe(z.email("E-mel tidak sah."))
    .transform((email) => email.toLowerCase()),
});

type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;

const genericSuccessMessage =
  "Jika akaun dengan e-mel tersebut wujud, pautan tetapan semula kata laluan telah dihantar.";

function safeForgotPasswordError(error: unknown): string {
  const parsed = parseApiError(error);

  if (parsed.code === "NETWORK_ERROR") {
    return "Rangkaian tidak tersedia. Sila semak sambungan internet anda dan cuba lagi.";
  }

  return "Permintaan tidak dapat dihantar buat masa ini. Sila cuba lagi.";
}

export default function ForgotPasswordPage() {
  const emailId = useId();
  const emailErrorId = useId();
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const form = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  });

  useEffect(() => {
    if (submitted) {
      headingRef.current?.focus();
    }
  }, [submitted]);

  const onSubmit = form.handleSubmit(async (values) => {
    setSubmitError(null);

    try {
      await requestPasswordReset({ email: values.email });
      setSubmitted(true);
    } catch (error) {
      setSubmitError(safeForgotPasswordError(error));
    }
  });

  if (submitted) {
    return (
      <section className="flex min-h-dvh items-center justify-center bg-background px-4 py-10 text-foreground sm:px-6">
        <Card className="w-full max-w-md rounded-2xl border border-border bg-card text-card-foreground shadow-sm">
          <CardHeader className="items-center space-y-3 text-center">
            <div className="flex size-12 items-center justify-center rounded-2xl border border-secondary/20 bg-secondary/10 text-secondary">
              <ShieldCheck className="size-6" aria-hidden="true" />
            </div>
            <CardTitle
              ref={headingRef}
              tabIndex={-1}
              className="text-2xl font-bold tracking-tight text-foreground"
            >
              Semak e-mel anda
            </CardTitle>
            <CardDescription className="text-sm leading-6 text-muted-foreground sm:text-base">
              {genericSuccessMessage}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="h-11 w-full rounded-xl font-semibold">
              <Link to="/login">Kembali ke Log Masuk</Link>
            </Button>
          </CardContent>
        </Card>
      </section>
    );
  }

  const emailError = form.formState.errors.email?.message;
  const isSubmitting = form.formState.isSubmitting;

  return (
    <section className="flex min-h-dvh items-center justify-center bg-background px-4 py-10 text-foreground sm:px-6">
      <div className="w-full max-w-md space-y-4">
        <Card className="rounded-2xl border border-border bg-card text-card-foreground shadow-sm">
          <CardHeader className="items-center space-y-3 text-center">
            <div className="flex size-12 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
              <Mail className="size-6" aria-hidden="true" />
            </div>
            <CardTitle className="text-2xl font-bold tracking-tight text-foreground">
              Lupa Kata Laluan?
            </CardTitle>
            <CardDescription className="text-sm leading-6 text-muted-foreground sm:text-base">
              Masukkan alamat e-mel yang didaftarkan. Kami akan menghantar pautan untuk menetapkan semula kata laluan anda.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-5" onSubmit={onSubmit} noValidate>
              <div className="space-y-2">
                <Label htmlFor={emailId} className="text-sm font-semibold text-foreground">
                  E-mel
                </Label>
                <div className="relative">
                  <Mail
                    className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                    aria-hidden="true"
                  />
                  <Input
                    id={emailId}
                    type="email"
                    autoComplete="email"
                    spellCheck={false}
                    placeholder="nama@contoh.com"
                    disabled={isSubmitting}
                    aria-invalid={emailError ? true : undefined}
                    aria-describedby={emailError ? emailErrorId : undefined}
                    className="h-12 rounded-xl pl-10 text-base"
                    {...form.register("email")}
                  />
                </div>
                {emailError ? (
                  <p id={emailErrorId} role="alert" className="text-sm text-destructive">
                    {emailError}
                  </p>
                ) : null}
              </div>

              {submitError ? (
                <p className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive" role="alert">
                  {submitError}
                </p>
              ) : null}

              <Button
                type="submit"
                className="h-11 w-full gap-2 rounded-xl font-semibold"
                disabled={isSubmitting}
              >
                {isSubmitting ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : null}
                {isSubmitting ? "Menghantar..." : "Hantar Pautan Tetapan Semula"}
              </Button>
            </form>

            <div className="mt-5 text-center text-sm text-muted-foreground">
              Ingat kata laluan anda?{" "}
              <Link
                to="/login"
                className="font-semibold text-primary transition-colors hover:text-primary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                Kembali ke Log Masuk
              </Link>
            </div>
          </CardContent>
        </Card>

        <aside className="rounded-2xl border border-border bg-card p-4 text-card-foreground shadow-sm">
          <div className="flex gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-accent/25 bg-accent/10 text-accent">
              <GraduationCap className="size-5" aria-hidden="true" />
            </div>
            <div className="space-y-1">
              <h2 className="text-sm font-semibold text-foreground">Murid menggunakan PIN</h2>
              <p className="text-sm leading-6 text-muted-foreground">
                Murid tidak menggunakan pemulihan kata laluan melalui e-mel. Sila hubungi guru untuk menetapkan semula PIN.
              </p>
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}
