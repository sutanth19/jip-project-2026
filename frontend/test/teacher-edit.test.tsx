import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";
import { MemoryRouter } from "react-router-dom";

import {
  TeacherEditForm,
  TeacherEditSkeleton,
} from "@/features/admin/components/TeacherEditForm";
import {
  buildTeacherUpdatePayload,
  getTeacherEditChangedFieldSummary,
  getTeacherEditDefaultValues,
  isTeacherEditSaveEnabled,
  mapTeacherEditSubmissionError,
  teacherEditFormSchema,
} from "@/features/admin/utils/teacher-edit";
import type { TeacherDetail } from "@/features/admin/utils/teacher-detail";
import { ApiError } from "@/lib/api";

const teacherDetail: TeacherDetail = {
  id: "33333333-3333-4333-8333-333333333333",
  teacherId: "GURU001",
  fullName: "Cikgu Aisyah",
  email: "aisyah@example.edu.my",
  phone: "0123456789",
  avatar: null,
  accountStatus: "ACTIVE",
  setupStatus: "PENDING",
  isFirstLogin: true,
  lastLogin: null,
  createdAt: "2026-07-01T08:00:00.000Z",
  updatedAt: "2026-07-31T08:00:00.000Z",
  school: {
    id: "11111111-1111-4111-8111-111111111111",
    schoolName: "SJKT Taman Harmoni",
    schoolCode: "SJKT200",
    logo: "/api/media/files/school-logo/sjkt200.png",
    principalName: "Puan Devi",
    contactEmail: "tamanharmoni@school.edu.my",
    phone: "0187654321",
  },
};

function renderEditForm(detail: TeacherDetail = teacherDetail) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return renderToStaticMarkup(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <TeacherEditForm
          detail={detail}
          detailPath={`/admin/guru/${detail.id}`}
          onSubmit={async () => undefined}
        />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("Edit Guru page", () => {
  it("uses the real Guru edit route branch and page copy", () => {
    const routes = readFileSync(new URL("../src/routes/index.tsx", import.meta.url), "utf8");
    const page = readFileSync(new URL("../src/features/admin/pages/AdminEntityFormPage.tsx", import.meta.url), "utf8");
    const config = readFileSync(new URL("../src/features/admin/config.ts", import.meta.url), "utf8");
    const api = readFileSync(new URL("../src/features/admin/api/admin.api.ts", import.meta.url), "utf8");

    expect(routes).toContain('path: "guru/:id/edit", element: <AdminEntityFormPage entityKey="teachers" mode="edit" />');
    expect(page).toContain("isTeacherEdit");
    expect(page).toContain("TeacherEditView");
    expect(page).toContain('title="Edit Guru"');
    expect(page).toContain('description="Kemas kini maklumat guru."');
    expect(page).toContain("Maklumat guru berjaya dikemas kini.");
    expect(config).toContain('editFieldNames: ["schoolId", "fullName", "email", "phone"]');
    expect(api).toContain('`${config.endpoint}/${id}`');
  });

  it("renders the production form layout with current values and exact field order", () => {
    const markup = renderEditForm();
    const labels = ["Sekolah", "Nama Penuh", "E-mel", "Nombor Telefon"];
    const positions = labels.map((label) => markup.indexOf(label));

    expect(markup).toContain("Maklumat Akaun");
    expect(markup).toContain("Kemas kini maklumat guru dan sekolah tempat guru ini bertugas.");
    expect(markup).toContain("SJKT Taman Harmoni");
    expect(markup).toContain("SJKT200");
    expect(getTeacherEditDefaultValues(teacherDetail)).toEqual({
      schoolId: "11111111-1111-4111-8111-111111111111",
      fullName: "Cikgu Aisyah",
      email: "aisyah@example.edu.my",
      phone: "0123456789",
    });
    expect(positions.every((position) => position >= 0)).toBe(true);
    expect(positions).toEqual([...positions].sort((left, right) => left - right));
    expect(markup).not.toContain("teacherId");
    expect(markup).not.toContain("accountStatus");
    expect(markup).not.toContain("setupToken");
    expect(markup).not.toContain("passwordHash");
  });

  it("keeps the current school visible even when it is not returned by active school options", () => {
    const inactiveMarkup = renderEditForm({
      ...teacherDetail,
      school: {
        ...teacherDetail.school,
        id: "22222222-2222-4222-8222-222222222222",
        schoolName: "SK Lama Diarkib",
        schoolCode: "SKOLD",
      },
    });

    expect(inactiveMarkup).toContain("SK Lama Diarkib");
    expect(inactiveMarkup).toContain("SKOLD");
  });

  it("builds changed-field-only PATCH payloads and preserves immutable account fields", () => {
    const defaults = getTeacherEditDefaultValues(teacherDetail);
    const payload = buildTeacherUpdatePayload(
      {
        ...defaults,
        schoolId: "22222222-2222-4222-8222-222222222222",
        fullName: " Cikgu Aisyah Baharu ",
        email: " AISYAH.BAHARU@EXAMPLE.EDU.MY ",
        phone: "",
      },
      { schoolId: true, fullName: true, email: true, phone: true },
      defaults,
    );

    expect(payload).toEqual({
      schoolId: "22222222-2222-4222-8222-222222222222",
      fullName: "Cikgu Aisyah Baharu",
      email: "aisyah.baharu@example.edu.my",
      phone: null,
    });
    expect(payload).not.toHaveProperty("teacherId");
    expect(payload).not.toHaveProperty("role");
    expect(payload).not.toHaveProperty("accountStatus");
    expect(payload).not.toHaveProperty("isFirstLogin");
    expect(payload).not.toHaveProperty("setupToken");
    expect(payload).not.toHaveProperty("passwordHash");
  });

  it("does not submit unchanged values and disables save while unchanged", () => {
    const defaults = getTeacherEditDefaultValues(teacherDetail);

    expect(buildTeacherUpdatePayload(defaults, {}, defaults)).toEqual({});
    expect(isTeacherEditSaveEnabled({ isDirty: false, isValid: true, isSubmitting: false })).toBe(false);
    expect(isTeacherEditSaveEnabled({ isDirty: true, isValid: true, isSubmitting: false })).toBe(true);
  });

  it("summarizes changed fields using school names", () => {
    const defaults = getTeacherEditDefaultValues(teacherDetail);
    const values = { ...defaults, schoolId: "22222222-2222-4222-8222-222222222222" };
    const summary = getTeacherEditChangedFieldSummary({
      payload: { schoolId: values.schoolId },
      values,
      defaults,
      schoolNames: {
        [defaults.schoolId]: "SJKT Taman Harmoni (SJKT200)",
        [values.schoolId]: "SK Damai (SKD001)",
      },
    });

    expect(summary).toEqual([
      {
        name: "schoolId",
        label: "Sekolah",
        before: "SJKT Taman Harmoni (SJKT200)",
        after: "SK Damai (SKD001)",
      },
    ]);
  });

  it("maps validation and backend errors safely", () => {
    expect(teacherEditFormSchema.safeParse({ schoolId: "", fullName: "  ", email: "bad", phone: "123" }).success).toBe(false);
    expect(mapTeacherEditSubmissionError(new ApiError("Conflict", 409, "TEACHER_EMAIL_EXISTS"))).toEqual({
      field: "email",
      message: "E-mel ini telah digunakan oleh akaun lain.",
    });
    expect(mapTeacherEditSubmissionError(new ApiError("Inactive", 403, "TEACHER_SCHOOL_INACTIVE"))).toEqual({
      field: "schoolId",
      message: "Sekolah yang dipilih tidak aktif.",
    });
    expect(mapTeacherEditSubmissionError(new ApiError("Not found", 404, "SCHOOL_NOT_FOUND"))).toEqual({
      field: "schoolId",
      message: "Sekolah yang dipilih tidak sah.",
    });
  });

  it("includes confirmation, dirty-discard, accessibility, and skeleton states", () => {
    const source = readFileSync(new URL("../src/features/admin/components/TeacherEditForm.tsx", import.meta.url), "utf8");
    const page = readFileSync(new URL("../src/features/admin/pages/AdminEntityFormPage.tsx", import.meta.url), "utf8");
    const skeleton = renderToStaticMarkup(<TeacherEditSkeleton />);

    expect(source).toContain("form.reset(defaults)");
    expect(source).toContain("Simpan perubahan guru?");
    expect(source).toContain("Pastikan maklumat guru dan sekolah yang dipilih adalah betul.");
    expect(source).toContain("Buang perubahan?");
    expect(source).toContain("Maklumat yang belum disimpan akan hilang.");
    expect(source).toContain("aria-invalid");
    expect(source).toContain('role="alert"');
    expect(source).toContain('role="status"');
    expect(source).toContain("SchoolSelect");
    expect(source).toContain("teacher-edit-options");
    expect(source).toContain("isDirty");
    expect(source).toContain("disabled={!canSave}");
    expect(page).toContain("Guru tidak ditemui");
    expect(page).toContain("Rekod guru ini tidak wujud atau tidak lagi tersedia.");
    expect(page).toContain("Maklumat guru tidak dapat dimuatkan");
    expect(page).toContain("Sila cuba lagi.");
    expect(skeleton).toContain("rounded-2xl");
  });
});
