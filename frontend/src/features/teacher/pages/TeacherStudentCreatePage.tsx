import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

import { ManagementPageLayout } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { createTeacherStudent } from "@/features/teacher/api/teacher-student.api";
import { TeacherStudentCreateForm } from "@/features/teacher/components/TeacherStudentCreateForm";
import { TeacherStudentNoSchoolState } from "@/features/teacher/components/TeacherStudentList";
import { teacherClassKeys, useTeacherClassList } from "@/features/teacher/hooks/use-teacher-class-list";
import { teacherStudentKeys } from "@/features/teacher/hooks/use-teacher-student-list";
import type { TeacherStudentCreatePayload } from "@/features/teacher/types/teacher-student.types";
import { defaultTeacherClassQuery } from "@/features/teacher/utils/teacher-class";
import { mapTeacherStudentCreateSubmissionError } from "@/features/teacher/utils/teacher-student-create";
import { parseApiError } from "@/lib/api";
import { useToast } from "@/providers/toast-context-value";
import { useAuthStore } from "@/stores/auth-store";

export function TeacherStudentCreatePage() {
  const school = useAuthStore((state) => state.school);
  const toast = useToast();
  const queryClient = useQueryClient();
  const classList = useTeacherClassList({
    page: 1,
    limit: 100,
    status: "ACTIVE",
    academicYear: defaultTeacherClassQuery.academicYear,
    sortBy: defaultTeacherClassQuery.sortBy,
    sortOrder: defaultTeacherClassQuery.sortOrder,
  }, Boolean(school?.id));
  const createMutation = useMutation({
    mutationFn: (payload: TeacherStudentCreatePayload) => createTeacherStudent(payload),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: teacherStudentKeys.all }),
        queryClient.invalidateQueries({ queryKey: teacherClassKeys.all }),
      ]);
      toast.success("Murid berjaya didaftarkan.");
    },
    onError: (error) => {
      const parsed = parseApiError(error);
      if (["STUDENT_ID_EXISTS", "SCHOOL_CLASS_NOT_FOUND", "SCHOOL_CLASS_INACTIVE", "STUDENT_CLASS_TRANSFER_INVALID"].includes(parsed.code ?? "")) return;
      toast.error("Murid tidak dapat didaftarkan", mapTeacherStudentCreateSubmissionError(error).message);
    },
  });

  return (
    <ManagementPageLayout
      breadcrumb={[
        { label: "Guru", to: "/guru" },
        { label: "Murid", to: "/guru/murid" },
        { label: "Tambah Murid" },
      ]}
      title="Tambah Murid"
      description="Daftarkan murid Program Pemulihan Khas bagi sekolah anda."
      currentAccent="secondary"
      actions={
        <Button asChild variant="outline" className="h-11 w-full gap-2 rounded-xl px-5 focus-visible:ring-secondary/30 sm:w-auto">
          <Link to="/guru/murid">
            <ArrowLeft className="size-4" aria-hidden="true" />
            Kembali
          </Link>
        </Button>
      }
    >
      {!school?.id ? <TeacherStudentNoSchoolState /> : null}
      {school?.id ? (
        <TeacherStudentCreateForm
          classes={classList.data?.classes ?? []}
          classesLoading={classList.isLoading}
          classesError={classList.isError}
          onRetryClasses={() => void classList.refetch()}
          submitting={createMutation.isPending}
          onSubmit={async (payload) => {
            return createMutation.mutateAsync(payload);
          }}
        />
      ) : null}
    </ManagementPageLayout>
  );
}
