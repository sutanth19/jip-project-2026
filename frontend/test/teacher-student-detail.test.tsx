import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { MemoryRouter } from "react-router-dom";

import { TeacherStudentDetailView } from "@/features/teacher/components/TeacherStudentDetailView";
import { TeacherStudentEditForm } from "@/features/teacher/components/TeacherStudentEditForm";
import { TeacherStudentNoSchoolState } from "@/features/teacher/components/TeacherStudentList";
import { normalizeTeacherStudentDetailResponse } from "@/features/teacher/utils/teacher-student-detail";

const detailFixture = {
  student: {
    id: "44444444-4444-4444-8444-444444444444",
    userId: "88888888-8888-4888-8888-888888888888",
    schoolId: "11111111-1111-4111-8111-111111111111",
    classId: "22222222-2222-4222-8222-222222222222",
    studentId: "MURID-0001",
    fullName: "Adik Aisyah",
    gender: "FEMALE",
    birthDate: "2016-03-12",
    avatar: null,
    accountStatus: "ACTIVE",
    isPinChanged: true,
    createdAt: "2026-07-10T08:00:00.000Z",
    updatedAt: "2026-07-20T08:00:00.000Z",
    linkedParentCount: 1,
    school: {
      id: "11111111-1111-4111-8111-111111111111",
      schoolCode: "SJKT200",
      schoolName: "SJKT Taman Harmoni",
    },
    class: {
      id: "22222222-2222-4222-8222-222222222222",
      className: "A",
      yearLevel: 2,
      academicYear: 2026,
    },
    parents: [
      {
        id: "55555555-5555-4555-8555-555555555555",
        fullName: "Pn. Siti",
        relationship: "MOTHER",
        avatar: null,
      },
    ],
  },
};

function renderDetail() {
  const detail = normalizeTeacherStudentDetailResponse(detailFixture).student;
  if (!detail) throw new Error("Invalid student detail fixture");

  return renderToStaticMarkup(
    <MemoryRouter>
      <TeacherStudentDetailView
        detail={detail}
        onStatusChange={async () => undefined}
        onResetPin={async () => ({ credentials: { studentId: "MURID-0001", temporaryPin: "0274" } })}
        onCopyLoginInfo={async () => undefined}
      />
    </MemoryRouter>,
  );
}

describe("Butiran Murid detail and edit pages", () => {
  it("routes the real Murid detail and edit pages instead of the generic teacher placeholder", () => {
    const routes = readFileSync(new URL("../src/routes/index.tsx", import.meta.url), "utf8");
    const detailPage = readFileSync(new URL("../src/features/teacher/pages/TeacherStudentDetailPage.tsx", import.meta.url), "utf8");
    const editPage = readFileSync(new URL("../src/features/teacher/pages/TeacherStudentEditPage.tsx", import.meta.url), "utf8");
    const editForm = readFileSync(new URL("../src/features/teacher/components/TeacherStudentEditForm.tsx", import.meta.url), "utf8");

    expect(routes).toContain('path: "murid/:studentId", element: <TeacherStudentDetailPage />');
    expect(routes).toContain('path: "murid/:studentId/edit", element: <TeacherStudentEditPage />');
    expect(routes).not.toContain('path: "murid/:studentId", element: <TeacherDetailPage resource="students" />');
    expect(detailPage).toContain('title="Butiran Murid"');
    expect(detailPage).toContain('Edit Murid');
    expect(editPage).toContain('title="Edit Murid"');
    expect(editForm).toContain('Simpan Perubahan');
  });

  it("renders the student summary, school information, parent section, and read-only account controls", () => {
    const markup = renderDetail();
    const source = readFileSync(new URL("../src/features/teacher/components/TeacherStudentDetailView.tsx", import.meta.url), "utf8");

    expect(markup).toContain("Adik Aisyah");
    expect(markup).toContain("MURID-0001");
    expect(markup).toContain("Aktif");
    expect(markup).toContain("Tetapkan Semula PIN");
    expect(markup).toContain("Maklumat Murid");
    expect(markup).toContain("Maklumat Log Masuk");
    expect(markup).toContain("Maklumat Sekolah");
    expect(markup).toContain("Ibu Bapa / Penjaga");
    expect(markup).toContain("Kawalan Akaun");
    expect(markup).toContain("Zon Bahaya");
    expect(markup).toContain("SJKT Taman Harmoni");
    expect(markup).toContain("SJKT200");
    expect(markup).toContain("Tahun 2");
    expect(markup).toContain("Pn. Siti");
    expect(markup).toContain("MOTHER");
    expect(markup).toContain("Status Akaun");
    expect(markup).not.toContain("Tahap Pemulihan");
    expect(markup).not.toContain("Tarikh Lahir");
    expect(markup).not.toContain("setupToken");
    expect(source).toContain("function StudentLoginCard");
    expect(source).toContain("<StudentLoginCard detail={detail}");
    expect(source).toContain("<StudentSchoolCard detail={detail} />");
    expect(source).toContain("lg:grid-cols-2");
    expect(source.indexOf("<StudentInformationCard")).toBeLessThan(source.indexOf("<StudentAccountControlCard"));
    expect(source.indexOf("<StudentLoginCard")).toBeLessThan(source.indexOf("<StudentParentCard"));
    expect(source.indexOf("<StudentParentCard")).toBeLessThan(source.indexOf("<StudentSchoolCard detail={detail} />"));
  });

  it("keeps the reset PIN success dialog secure, guarded, and styled as a one-time credential handoff", () => {
    const source = readFileSync(new URL("../src/features/teacher/components/TeacherStudentDetailView.tsx", import.meta.url), "utf8");

    expect(source).toContain("PIN Baharu Berjaya Dijana");
    expect(source).toContain("Berikan maklumat ini kepada murid. PIN hanya akan dipaparkan sekali.");
    expect(source).toContain("Nama Murid");
    expect(source).toContain("ID Murid");
    expect(source).toContain("PIN Baharu");
    expect(source).toContain("PIN hanya dipaparkan sekali");
    expect(source).toContain("Salin atau catat ID Murid dan PIN sebelum menutup dialog.");
    expect(source).toContain("Salin ID dan PIN");
    expect(source).toContain("ID dan PIN telah disalin");
    expect(source).toContain("Maklumat belum disalin");
    expect(source).toContain("Tutup Tanpa Menyalin");
    expect(source).toContain("Tunjukkan PIN baharu");
    expect(source).toContain("Sembunyikan PIN baharu");
    expect(source).toContain('`PIN: ${result.credentials.temporaryPin}`');
    expect(source).toContain('result.credentials.temporaryPin.split("").join(" ")');
    expect(source).toContain("setResult(null)");
    expect(source).toContain("setVisible(false)");
    expect(source).toContain("setCopied(false)");
    expect(source).toContain("onEscapeKeyDown");
    expect(source).toContain("event.preventDefault()");
    expect(source).toContain("w-[calc(100%-2rem)]");
    expect(source).toContain("max-w-2xl");
    expect(source).not.toContain("PIN Baharu: ${result.credentials.temporaryPin}");
    expect(source).not.toContain("localStorage");
    expect(source).not.toContain("sessionStorage");
    expect(source).not.toContain("console.log");
  });

  it("keeps the edit form compact, strict, and focused on the permitted field only", () => {
    const source = readFileSync(new URL("../src/features/teacher/components/TeacherStudentEditForm.tsx", import.meta.url), "utf8");
    const detail = normalizeTeacherStudentDetailResponse(detailFixture).student;
    if (!detail) throw new Error("Invalid student detail fixture");
    const classes = [{
      id: "66666666-6666-4666-8666-666666666666",
      className: "A",
      yearLevel: 2,
      academicYear: 2026,
      studentCount: 0,
      accountStatus: "ACTIVE" as const,
      teacherId: "",
      schoolId: detail.schoolId,
      createdAt: detail.createdAt,
      updatedAt: detail.updatedAt,
    }];

    const markup = renderToStaticMarkup(
      <MemoryRouter>
        <TeacherStudentEditForm detail={detail} classes={classes} classesLoading={false} classesError={false} onRetryClasses={() => undefined} submitting={false} onSubmit={async () => undefined} />
      </MemoryRouter>,
    );

    expect(markup).toContain("Maklumat Murid");
    expect(markup).toContain("Nama Penuh");
    expect(markup).toContain("Tahun");
    expect(markup).toContain("Jantina");
    expect(markup).toContain("Kelas Asal");
    expect(markup).toContain("Simpan Perubahan");
    expect(markup).toContain("Batal");
    expect(source).toContain('teacherStudentEditFormSchema');
    expect(source).toContain('ID Murid tidak boleh diubah');
    expect(source).toContain('justify-start');
    expect(source).not.toContain('birthDate');
    expect(source).not.toContain('avatar');
  });

  it("keeps the teacher no-school fallback available for both pages", () => {
    const markup = renderToStaticMarkup(<TeacherStudentNoSchoolState />);

    expect(markup).toContain("Sekolah belum ditetapkan");
    expect(markup).toContain("Guru ini belum dipautkan kepada sekolah.");
  });
});
