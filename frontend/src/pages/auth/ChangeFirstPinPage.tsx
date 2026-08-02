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
    currentPin: z.string().regex(/^\d{4}$/, "PIN mesti 4 digit."),
    newPin: z.string().regex(/^\d{4}$/, "PIN mesti 4 digit."),
    confirmPin: z.string().regex(/^\d{4}$/, "PIN mesti 4 digit."),
  })
  .refine((values) => values.newPin === values.confirmPin, {
    message: "Pengesahan PIN tidak sepadan.",
    path: ["confirmPin"],
  });

type FormValues = z.infer<typeof schema>;

type ResponseData = {
  accessToken: string;
  refreshToken?: string | null;
  requiresPinChange: false;
  user: {
    id: string;
    role: "STUDENT";
    accountStatus: string;
  };
};

export default function ChangeFirstPinPage() {
  const navigate = useNavigate();
  const currentPinId = useId();
  const newPinId = useId();
  const confirmPinId = useId();
  const { profile, rememberMe, setSession } = useAuthStore();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      currentPin: "",
      newPin: "",
      confirmPin: "",
    },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    const data = await apiRequest<ResponseData>(
      "/auth/student/change-first-pin",
      {
        method: "POST",
        body: JSON.stringify(values),
      },
    );

    if (profile && "studentId" in profile) {
      setSession({
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        user: {
          id: data.user.id,
          role: "STUDENT",
          email: null,
          accountStatus: data.user.accountStatus,
        },
        profile,
        rememberMe,
        requiresPinChange: data.requiresPinChange,
      });
    }

    navigate(getDashboardPathForRole("STUDENT"), { replace: true });
  });

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-4 py-10">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>Tukar PIN pertama</CardTitle>
          <CardDescription>Masukkan PIN semasa dan tetapkan PIN baharu.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={onSubmit}>
            <PasswordInput id={currentPinId} label="PIN semasa" errorMessage={form.formState.errors.currentPin?.message} {...form.register("currentPin")} />
            <PasswordInput id={newPinId} label="PIN baharu" errorMessage={form.formState.errors.newPin?.message} {...form.register("newPin")} />
            <PasswordInput id={confirmPinId} label="Sahkan PIN baharu" errorMessage={form.formState.errors.confirmPin?.message} {...form.register("confirmPin")} />
            <Button type="submit" className="w-full">Kemaskini PIN</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
