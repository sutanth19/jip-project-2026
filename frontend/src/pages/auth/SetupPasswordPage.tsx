import { useId, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, KeyRound } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import PasswordInput from "@/components/auth/PasswordInput";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { parseApiError } from "@/lib/api";
import { setupPassword } from "@/services/auth.service";

const schema = z
  .object({
    password: z.string().min(8, "Kata laluan mesti sekurang-kurangnya 8 aksara."),
    confirmPassword: z.string().min(1, "Pengesahan kata laluan diperlukan."),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: "Pengesahan kata laluan tidak sepadan.",
    path: ["confirmPassword"],
  });

type FormValues = z.infer<typeof schema>;

export default function SetupPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const passwordId = useId();
  const confirmPasswordId = useId();
  const token = searchParams.get("token") ?? "";
  const [submitError, setSubmitError] = useState<string | null>(null);
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    setSubmitError(null);

    try {
      await setupPassword({ token, password: values.password });
      navigate("/login", { replace: true });
    } catch (error) {
      setSubmitError(parseApiError(error).message);
    }
  });

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-4 py-10 text-foreground sm:px-6">
      <Card className="w-full max-w-md rounded-2xl border border-border bg-card text-card-foreground shadow-sm">
        <CardHeader className="items-center space-y-3 text-center">
          <div className="flex size-12 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
            <KeyRound className="size-6" aria-hidden="true" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight text-foreground">
            Lengkapkan akaun
          </CardTitle>
          <CardDescription className="text-sm leading-6 text-muted-foreground sm:text-base">
            Cipta kata laluan baharu untuk mengaktifkan akaun Digital MoLIB anda.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!token ? (
            <div className="space-y-4">
              <p className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                Pautan penyediaan tidak sah. Sila minta pentadbir menghantar semula pautan setup.
              </p>
              <Button asChild variant="outline" className="w-full rounded-xl">
                <Link to="/login">
                  <ArrowLeft className="size-4" aria-hidden="true" />
                  Kembali ke log masuk
                </Link>
              </Button>
            </div>
          ) : (
            <form className="space-y-4" onSubmit={onSubmit}>
              <PasswordInput
                id={passwordId}
                label="Kata laluan baharu"
                errorMessage={form.formState.errors.password?.message}
                {...form.register("password")}
              />
              <PasswordInput
                id={confirmPasswordId}
                label="Sahkan kata laluan baharu"
                errorMessage={form.formState.errors.confirmPassword?.message}
                {...form.register("confirmPassword")}
              />
              {submitError ? (
                <p className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive" role="alert">
                  {submitError}
                </p>
              ) : null}
              <Button type="submit" className="w-full rounded-xl" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Menyimpan..." : "Lengkapkan Akaun"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
