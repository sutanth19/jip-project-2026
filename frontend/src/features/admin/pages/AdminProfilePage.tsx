import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { ErrorState, LoadingState, PageContainer, SectionCard } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AdminForm } from "@/features/admin/components/AdminForm";
import { AdminPageHeader } from "@/features/admin/components/AdminPageHeader";
import { AdminRecordDetails } from "@/features/admin/components/AdminRecordDetails";
import { apiRequest } from "@/lib/api";
import { parseApiError } from "@/lib/api";
import { useToast } from "@/providers/toast-context-value";
import type { AdminEntityConfig } from "@/features/admin/types/admin.types";

const profileFormConfig: AdminEntityConfig = {
  key: "admins",
  title: "Profil",
  singular: "Profil",
  description: "Profil pengguna semasa.",
  path: "/admin/profil",
  endpoint: "/profile/me",
  roles: ["SUPER_ADMIN", "ADMIN"],
  columns: [],
  fields: [
    { name: "fullName", label: "Nama penuh", required: true },
    { name: "phone", label: "Telefon" },
    { name: "position", label: "Jawatan" },
  ],
};

export function AdminProfilePage() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const profile = useQuery({
    queryKey: ["admin", "profile"],
    queryFn: () => apiRequest<Record<string, unknown>>("/profile/me"),
  });
  const account = useQuery({
    queryKey: ["admin", "profile", "account"],
    queryFn: () => apiRequest<Record<string, unknown>>("/profile/account"),
  });
  const updateProfile = useMutation({
    mutationFn: (values: Record<string, unknown>) =>
      apiRequest<Record<string, unknown>>("/profile/me", {
        method: "PATCH",
        body: JSON.stringify(values),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin", "profile"] });
      toast.success("Profil dikemas kini.");
    },
    onError: (error) => toast.error("Profil gagal dikemas kini", parseApiError(error).message),
  });
  const changePassword = useMutation({
    mutationFn: (values: Record<string, unknown>) =>
      apiRequest<Record<string, unknown>>("/profile/change-password", {
        method: "POST",
        body: JSON.stringify(values),
      }),
    onSuccess: () => toast.success("Kata laluan dikemas kini."),
    onError: (error) => toast.error("Kata laluan gagal dikemas kini", parseApiError(error).message),
  });

  return (
    <PageContainer>
      <AdminPageHeader title="Profil" description="Maklumat akaun selamat daripada endpoint profile sedia ada." />
      {profile.isLoading || account.isLoading ? <LoadingState /> : null}
      {profile.isError || account.isError ? <ErrorState title="Profil gagal dimuatkan" /> : null}
      {profile.data ? (
        <SectionCard title="Profil">
          <AdminRecordDetails record={profile.data} />
        </SectionCard>
      ) : null}
      {profile.data ? (
        <SectionCard title="Edit Profil" description="Medan ini dipadankan dengan validator profile backend.">
          <AdminForm
            config={profileFormConfig}
            defaultValues={profile.data}
            submitLabel={updateProfile.isPending ? "Menyimpan..." : "Simpan profil"}
            onSubmit={async (values) => {
              await updateProfile.mutateAsync(values);
            }}
          />
        </SectionCard>
      ) : null}
      <SectionCard title="Tukar Kata Laluan">
        <form
          className="grid gap-4 md:grid-cols-3"
          onSubmit={(event) => {
            event.preventDefault();
            const formData = new FormData(event.currentTarget);
            void changePassword.mutateAsync({
              currentPassword: String(formData.get("currentPassword") ?? ""),
              newPassword: String(formData.get("newPassword") ?? ""),
              confirmPassword: String(formData.get("confirmPassword") ?? ""),
            });
          }}
        >
          <div>
            <Label htmlFor="currentPassword">Kata laluan semasa</Label>
            <Input id="currentPassword" name="currentPassword" type="password" className="mt-2" />
          </div>
          <div>
            <Label htmlFor="newPassword">Kata laluan baharu</Label>
            <Input id="newPassword" name="newPassword" type="password" className="mt-2" />
          </div>
          <div>
            <Label htmlFor="confirmPassword">Sahkan kata laluan</Label>
            <Input id="confirmPassword" name="confirmPassword" type="password" className="mt-2" />
          </div>
          <div className="md:col-span-3">
            <Button type="submit" disabled={changePassword.isPending}>
              {changePassword.isPending ? "Mengemas kini..." : "Tukar kata laluan"}
            </Button>
          </div>
        </form>
      </SectionCard>
      {account.data ? (
        <SectionCard title="Akaun">
          <AdminRecordDetails record={account.data} />
        </SectionCard>
      ) : null}
    </PageContainer>
  );
}
