import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { parseApiError } from "@/lib/api";
import { Link, useNavigate } from "react-router-dom";

import { ManagementPageLayout } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { createTeacherClass } from "@/features/teacher/api/teacher-class.api";
import { TeacherClassCreateForm } from "@/features/teacher/components/TeacherClassCreateForm";
import { TeacherClassNoSchoolState } from "@/features/teacher/components/TeacherClassList";
import { teacherClassKeys } from "@/features/teacher/hooks/use-teacher-class-list";
import type { TeacherClassCreatePayload } from "@/features/teacher/utils/teacher-class-create";
import { useToast } from "@/providers/toast-context-value";
import { useAuthStore } from "@/stores/auth-store";

export function TeacherClassCreatePage() {
  const school = useAuthStore((state) => state.school);
  const navigate = useNavigate();
  const toast = useToast();
  const queryClient = useQueryClient();
  const createMutation = useMutation({
    mutationFn: (payload: TeacherClassCreatePayload) => createTeacherClass(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: teacherClassKeys.all });
      toast.success("Kelas berjaya dicipta.");
      navigate("/guru/kelas", { replace: true });
    },
    onError: (error) => {
      const parsed = parseApiError(error);
      if (parsed.code === "CLASS_ALREADY_EXISTS") return;
      toast.error("Kelas tidak dapat dicipta", parsed.message);
    },
  });

  return (
    <ManagementPageLayout
      breadcrumb={[
        { label: "Guru", to: "/guru" },
        { label: "Kelas", to: "/guru/kelas" },
        { label: "Tambah Kelas" },
      ]}
      title="Tambah Kelas"
      description="Daftarkan kelas asal bagi sekolah anda."
      currentAccent="secondary"
      actions={
        <Button asChild variant="outline" className="h-11 w-full gap-2 rounded-xl px-5 focus-visible:ring-secondary/30 sm:w-auto">
          <Link to="/guru/kelas">
            <ArrowLeft className="size-4" aria-hidden="true" />
            Kembali
          </Link>
        </Button>
      }
    >
      {!school?.id ? <TeacherClassNoSchoolState /> : null}
      {school?.id ? (
        <TeacherClassCreateForm
          submitting={createMutation.isPending}
          onSubmit={async (payload) => {
            await createMutation.mutateAsync(payload);
          }}
        />
      ) : null}
    </ManagementPageLayout>
  );
}
