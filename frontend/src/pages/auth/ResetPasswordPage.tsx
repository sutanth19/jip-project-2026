import { useEffect, useId, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, CircleCheck, KeyRound, LoaderCircle, TriangleAlert } from "lucide-react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";

import PasswordInput from "@/components/auth/PasswordInput";
import { PasswordStrengthInput } from "@/components/auth/PasswordStrengthInput";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ApiError, parseApiError } from "@/lib/api";
import { isStrongPassword } from "@/lib/password-policy";
import { resetPassword } from "@/services/auth.service";

const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(1, "Sila masukkan kata laluan baharu.")
      .max(128, "Kata laluan tidak boleh melebihi 128 aksara.")
      .refine(isStrongPassword, "Kata laluan baharu tidak memenuhi keperluan keselamatan."),
    confirmPassword: z.string().min(1, "Sila sahkan kata laluan baharu."),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: "Kata laluan tidak sepadan",
    path: ["confirmPassword"],
  });

type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;

type ResetState = "form" | "success" | "expired" | "invalid";

function getResetErrorState(error: unknown): ResetState | "error" {
  const parsed = parseApiError(error);

  if (parsed instanceof ApiError && parsed.code === "PASSWORD_RESET_TOKEN_EXPIRED") {
    return "expired";
  }

  if (
    parsed instanceof ApiError &&
    (parsed.code === "PASSWORD_RESET_TOKEN_INVALID" || parsed.code === "PASSWORD_RESET_ACCOUNT_UNAVAILABLE")
  ) {
    return "invalid";
  }

  return "error";
}

function ResetStateCard({
  state,
  headingRef,
}: {
  state: Exclude<ResetState, "form"> | "missing";
  headingRef: React.RefObject<HTMLDivElement | null>;
}) {
  const isSuccess = state === "success";
  const content = {
    missing: {
      title: "Pautan tidak sah",
      description: "Pautan tetapan semula kata laluan tidak lengkap atau tidak sah.",
      icon: TriangleAlert,
    },
    expired: {
      title: "Pautan telah tamat tempoh",
      description: "Pautan tetapan semula kata laluan ini telah tamat tempoh. Sila buat permintaan baharu.",
      icon: TriangleAlert,
    },
    invalid: {
      title: "Pautan tidak sah atau telah digunakan",
      description: "Pautan ini tidak lagi boleh digunakan. Sila buat permintaan tetapan semula yang baharu.",
      icon: TriangleAlert,
    },
    success: {
      title: "Kata laluan berjaya ditetapkan semula",
      description: "Anda kini boleh log masuk menggunakan kata laluan baharu.",
      icon: CircleCheck,
    },
  }[state];
  const Icon = content.icon;

  return (
    <section className="flex min-h-dvh items-center justify-center bg-background px-4 py-10 text-foreground sm:px-6">
      <Card className="w-full max-w-md rounded-2xl border border-border bg-card text-card-foreground shadow-sm">
        <CardHeader className="items-center space-y-3 text-center">
          <div className={isSuccess ? "flex size-12 items-center justify-center rounded-2xl border border-secondary/20 bg-secondary/10 text-secondary" : "flex size-12 items-center justify-center rounded-2xl border border-destructive/20 bg-destructive/10 text-destructive"}>
            <Icon className="size-6" aria-hidden="true" />
          </div>
          <CardTitle
            ref={headingRef}
            tabIndex={-1}
            className="text-2xl font-bold tracking-tight text-foreground"
          >
            {content.title}
          </CardTitle>
          <CardDescription className="text-sm leading-6 text-muted-foreground sm:text-base">
            {content.description}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {state === "expired" || state === "invalid" ? (
            <Button asChild className="h-11 w-full rounded-xl font-semibold">
              <Link to="/forgot-password">Minta Pautan Baharu</Link>
            </Button>
          ) : null}
          <Button asChild variant={isSuccess ? "default" : "outline"} className="h-11 w-full rounded-xl font-semibold">
            <Link to="/login">{isSuccess ? "Pergi ke Log Masuk" : "Kembali ke Log Masuk"}</Link>
          </Button>
        </CardContent>
      </Card>
    </section>
  );
}

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const passwordId = useId();
  const confirmPasswordId = useId();
  const headingRef = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<ResetState>("form");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const form = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
    mode: "onChange",
  });

  useEffect(() => {
    if (state !== "form" || !token) {
      headingRef.current?.focus();
    }
  }, [state, token]);

  if (!token) {
    return <ResetStateCard state="missing" headingRef={headingRef} />;
  }

  if (state !== "form") {
    return <ResetStateCard state={state} headingRef={headingRef} />;
  }

  const onSubmit = form.handleSubmit(async (values) => {
    setSubmitError(null);

    try {
      await resetPassword({
        token,
        password: values.password,
        confirmPassword: values.confirmPassword,
      });
      setState("success");
    } catch (error) {
      const resetState = getResetErrorState(error);
      if (resetState === "expired" || resetState === "invalid") {
        setState(resetState);
        return;
      }

      setSubmitError("Kata laluan tidak dapat ditetapkan semula. Sila cuba lagi.");
    }
  });

  const isSubmitting = form.formState.isSubmitting;

  return (
    <section className="flex min-h-dvh items-center justify-center bg-background px-4 py-10 text-foreground sm:px-6">
      <Card className="w-full max-w-md rounded-2xl border border-border bg-card text-card-foreground shadow-sm">
        <CardHeader className="items-center space-y-3 text-center">
          <div className="flex size-12 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
            <KeyRound className="size-6" aria-hidden="true" />
          </div>
          <CardTitle
            ref={headingRef}
            tabIndex={-1}
            className="text-2xl font-bold tracking-tight text-foreground"
          >
            Tetapkan Kata Laluan Baharu
          </CardTitle>
          <CardDescription className="text-sm leading-6 text-muted-foreground sm:text-base">
            Cipta kata laluan baharu untuk akaun Digital Main-LiT anda.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-5" onSubmit={onSubmit} noValidate>
            <Controller
              name="password"
              control={form.control}
              render={({ field, fieldState }) => (
                <PasswordStrengthInput
                  id={passwordId}
                  name={field.name}
                  label="Kata Laluan Baharu"
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  error={fieldState.error?.message}
                  disabled={isSubmitting}
                  autoComplete="new-password"
                />
              )}
            />

            <PasswordInput
              id={confirmPasswordId}
              label="Sahkan Kata Laluan Baharu"
              autoComplete="new-password"
              disabled={isSubmitting}
              errorMessage={form.formState.errors.confirmPassword?.message}
              {...form.register("confirmPassword")}
            />

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
              {isSubmitting ? "Menyimpan..." : "Simpan Kata Laluan"}
            </Button>

            <Button asChild variant="outline" className="h-11 w-full gap-2 rounded-xl font-semibold">
              <Link to="/login">
                <ArrowLeft className="size-4" aria-hidden="true" />
                Kembali ke Log Masuk
              </Link>
            </Button>
          </form>
        </CardContent>
      </Card>
    </section>
  );
}
