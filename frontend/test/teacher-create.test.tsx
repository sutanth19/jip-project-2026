import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { MemoryRouter } from "react-router-dom";
import type { ReactNode } from "react";

import { SchoolSelect } from "@/features/admin/components/SchoolSelect";
import { TeacherCreateForm } from "@/features/admin/components/TeacherCreateForm";
import { toSchoolSelectOption } from "@/features/admin/utils/school-select";
import {
  buildTeacherCreatePayload,
  getTeacherCreateSummary,
  mapTeacherCreateSubmissionError,
  teacherCreateFormSchema,
} from "@/features/admin/utils/teacher-create";
import { ApiError } from "@/lib/api";

const activeSchool = {
  id: "11111111-1111-4111-8111-111111111111",
  schoolName: "SJKT Taman Harmoni",
  schoolCode: "SJKT200",
  logo: "/api/media/files/school-logo/sjkt200.png",
  accountStatus: "ACTIVE",
};

function renderWithQueryClient(element: ReactNode) {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  return renderToStaticMarkup(
    <QueryClientProvider client={client}>
      <MemoryRouter>{element}</MemoryRouter>
    </QueryClientProvider>,
  );
}

function visibleText(markup: string): string {
  return markup.replace(/<[^>]+>/g, "");
}

describe("Tambah Guru create form", () => {
  it("renders the real Tambah Guru route branch and page copy", () => {
    const page = readFileSync(new URL("../src/features/admin/pages/AdminEntityFormPage.tsx", import.meta.url), "utf8");

    expect(page).toContain('const isTeacherCreate = !isEdit && config.key === "teachers";');
    expect(page).toContain("<TeacherCreateForm");
    expect(page).toContain('title="Tambah Guru"');
    expect(page).toContain('description="Cipta akaun guru baharu."');
    expect(page).toContain('{ label: "Guru", to: config.path }');
  });

  it("renders the approved fields in the updated order with the shared create-page layout", () => {
    const markup = renderWithQueryClient(
      <TeacherCreateForm path="/admin/guru" onSubmit={async () => undefined} />,
    );
    const text = visibleText(markup);
    const labels = ["Sekolah", "Nama Penuh", "E-mel", "Nombor Telefon"];

    expect(markup).toContain("w-full overflow-hidden rounded-2xl border border-border bg-card shadow-sm");
    expect(markup).toContain("Maklumat Akaun");
    expect(markup).toContain("Akaun akan dicipta dalam status menunggu.");
    expect(markup).toContain("Pilih sekolah tempat guru ini bertugas.");
    labels.reduce((previousIndex, label) => {
      const currentIndex = text.indexOf(label);
      expect(currentIndex).toBeGreaterThan(previousIndex);
      return currentIndex;
    }, -1);
    expect(text).not.toContain("Jawatan");
    expect(text).not.toContain("Jantina");
    expect(text).not.toContain("Avatar");
    expect(text).not.toContain("ID Guru");
  });

  it("validates required fields, optional phone, email format, and schoolId", () => {
    expect(() => teacherCreateFormSchema.parse({ fullName: "", email: "", phone: "", schoolId: "" })).toThrow();
    expect(() => teacherCreateFormSchema.parse({ fullName: "Cikgu", email: "bukan-emel", phone: "", schoolId: activeSchool.id })).toThrow();
    expect(() => teacherCreateFormSchema.parse({ fullName: "Cikgu Aisyah", email: "aisyah@example.com", phone: "", schoolId: activeSchool.id })).not.toThrow();
  });

  it("builds the real backend payload with schoolId only and no display-only school fields", () => {
    const payload = buildTeacherCreatePayload({
      fullName: " Cikgu Aisyah ",
      email: " AISYAH@EXAMPLE.COM ",
      phone: "",
      schoolId: activeSchool.id,
    });

    expect(payload).toEqual({
      fullName: "Cikgu Aisyah",
      email: "aisyah@example.com",
      schoolId: activeSchool.id,
    });
    expect("schoolName" in payload).toBe(false);
    expect("schoolCode" in payload).toBe(false);
    expect("teacherId" in payload).toBe(false);
    expect("gender" in payload).toBe(false);
  });

  it("maps school options from real API records and excludes inactive schools in the form source", () => {
    const option = toSchoolSelectOption(activeSchool);
    const form = readFileSync(new URL("../src/features/admin/components/TeacherCreateForm.tsx", import.meta.url), "utf8");

    expect(option).toEqual({
      ...activeSchool,
      logo: "http://localhost:3001/api/media/files/school-logo/sjkt200.png",
    });
    expect(form).toContain('status: "ACTIVE"');
    expect(form).toContain('school.accountStatus === "ACTIVE"');
    expect(form).toContain("listAdminRecords(getAdminEntity(\"schools\")");
  });

  it("renders school selector closed, selected, and fallback states", () => {
    const loading = renderWithQueryClient(<SchoolSelect value="" onChange={() => undefined} schools={[]} isLoading={true} isError={false} onRetry={() => undefined} />);
    const empty = renderWithQueryClient(<SchoolSelect value="" onChange={() => undefined} schools={[]} isLoading={false} isError={false} onRetry={() => undefined} />);
    const selected = renderWithQueryClient(<SchoolSelect value={activeSchool.id} onChange={() => undefined} schools={[{ ...activeSchool, logo: null }]} isLoading={false} isError={false} onRetry={() => undefined} />);

    expect(loading).toContain("animate-spin");
    expect(empty).toContain("Pilih sekolah");
    expect(selected).toContain("SJKT Taman Harmoni");
    expect(selected).toContain("SJKT200");
    expect(selected).toContain("bg-secondary/10");
  });

  it("keeps compact school combobox popover, states, search, and keyboard behaviour in production code", () => {
    const source = readFileSync(new URL("../src/features/admin/components/SchoolSelect.tsx", import.meta.url), "utf8");

    expect(source).toContain("absolute left-0 top-full");
    expect(source).toContain("max-h-80 overflow-y-auto");
    expect(source).toContain("Cari nama atau kod sekolah...");
    expect(source).toContain("Tiada sekolah aktif");
    expect(source).toContain("Tambah atau aktifkan sekolah sebelum mencipta akaun guru.");
    expect(source).toContain("Tiada sekolah ditemui.");
    expect(source).toContain("Cuba nama atau kod sekolah yang lain.");
    expect(source).toContain("Memuatkan sekolah...");
    expect(source).toContain("Senarai sekolah tidak dapat dimuatkan.");
    expect(source).toContain("Cuba Lagi");
    expect(source).toContain("role=\"combobox\"");
    expect(source).toContain("role=\"listbox\"");
    expect(source).toContain("role=\"option\"");
    expect(source).toContain("aria-activedescendant");
    expect(source).toContain('event.key === "ArrowDown"');
    expect(source).toContain('event.key === "ArrowUp"');
    expect(source).toContain('event.key === "Enter"');
    expect(source).toContain('event.key === "Escape"');
    expect(source).toContain("<Check");
  });

  it("maps backend create errors safely to the expected fields", () => {
    expect(mapTeacherCreateSubmissionError(new ApiError("Conflict", 409, "TEACHER_EMAIL_EXISTS"))).toEqual({
      field: "email",
      message: "E-mel ini telah digunakan oleh akaun lain.",
    });
    expect(mapTeacherCreateSubmissionError(new ApiError("Missing", 404, "SCHOOL_NOT_FOUND"))).toEqual({
      field: "schoolId",
      message: "Sekolah yang dipilih tidak sah.",
    });
    expect(mapTeacherCreateSubmissionError(new ApiError("Inactive", 403, "TEACHER_SCHOOL_INACTIVE"))).toEqual({
      field: "schoolId",
      message: "Sekolah yang dipilih tidak aktif.",
    });
  });

  it("keeps confirmation, success, dirty-discard and no setup-link UI in the create form", () => {
    const source = readFileSync(new URL("../src/features/admin/components/TeacherCreateForm.tsx", import.meta.url), "utf8");
    const summary = getTeacherCreateSummary({
      fullName: "Cikgu Aisyah",
      email: "aisyah@example.com",
      phone: "",
      schoolId: activeSchool.id,
    }, activeSchool.schoolName);

    expect(summary.at(-1)?.value).toBe("SJKT Taman Harmoni");
    expect(source).toContain("Cipta akaun guru?");
    expect(source).toContain("Pastikan maklumat guru dan sekolah yang dipilih adalah betul.");
    expect(source).toContain("Guru berjaya dicipta");
    expect(source).toContain("Akaun guru telah dicipta dan e-mel penyediaan telah dihantar.");
    expect(source).toContain("Akaun guru telah dicipta, tetapi e-mel penyediaan tidak dapat dihantar.");
    expect(source).toContain("Buang perubahan?");
    expect(source).not.toContain("developmentSetupUrl");
    expect(source).not.toContain("setup-password?token");
    expect(source).not.toContain("Salin Pautan");
  });
});
