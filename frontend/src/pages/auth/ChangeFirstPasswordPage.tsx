import { useId } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

import PasswordInput from "@/components/auth/PasswordInput";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { apiRequest } from "@/lib/api";
import { getDashboardPathForRole } from "@/lib/auth-routes";
import { useAuthStore } from "@/stores/auth-store";

const schema = z
  .object({
    currentPassword: z.string().min(1, "Kata laluan semasa diperlukan."),
    newPassword: z.string().min(8, "Kata laluan baharu mesti sekurang-kurangnya 8 aksara."),
    confirmPassword: z.string().min(1, "Pengesahan kata laluan diperlukan."),
  })
  .refine((values) => values.newPassword === values.confirmPassword, {
    message: "Pengesahan kata laluan tidak sepadan.",
    path: ["confirmPassword"],
  });

type FormValues = z.infer<typeof schema>;

type ResponseData = {
  accessToken: string;
  expiresIn: string;
  requiresPasswordChange: false;
  user: {
    id: string;
    role: "SUPER_ADMIN" | "ADMIN" | "TEACHER" | "PARENT";
    email: string | null;
    accountStatus: string;
    isFirstLogin: false;
  };
};

export default function ChangeFirstPasswordPage() {
  const navigate = useNavigate();
  const currentPasswordId = useId();
  const newPasswordId = useId();
  const confirmPasswordId = useId();
  const { accessToken, user, profile, rememberMe, setSession } = useAuthStore();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    const data = await apiRequest<ResponseData>(
      "/auth/change-first-password",
      {
        method: "POST",
        body: JSON.stringify(values),
      },
      accessToken,
    );

    if (user && profile) {
      setSession({
        accessToken: data.accessToken,
        user: data.user,
        profile,
        rememberMe,
      });
    }

    navigate(getDashboardPathForRole(data.user.role), { replace: true });
  });

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-4 py-10">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>Tukar kata laluan pertama</CardTitle>
          <CardDescription>Masukkan kata laluan semasa dan tetapkan kata laluan baharu.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={onSubmit}>
            <PasswordInput id={currentPasswordId} label="Kata laluan semasa" errorMessage={form.formState.errors.currentPassword?.message} {...form.register("currentPassword")} />
            <PasswordInput id={newPasswordId} label="Kata laluan baharu" errorMessage={form.formState.errors.newPassword?.message} {...form.register("newPassword")} />
            <PasswordInput id={confirmPasswordId} label="Sahkan kata laluan baharu" errorMessage={form.formState.errors.confirmPassword?.message} {...form.register("confirmPassword")} />
            <Button type="submit" className="w-full">Kemaskini kata laluan</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
