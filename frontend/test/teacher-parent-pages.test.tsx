import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { MemoryRouter } from "react-router-dom";

import { TeacherParentDetailView } from "@/features/teacher/components/TeacherParentDetailView";
import { normalizeTeacherParentListResponse, teacherParentRelationshipLabel, teacherParentStatusLabel } from "@/features/teacher/utils/teacher-parent";

const detailFixture = {
  parent: {
    id: "33333333-3333-4333-8333-333333333333",
    userId: "44444444-4444-4444-8444-444444444444",
    fullName: "Pn. Nana",
    phone: "0123456789",
    email: "nana@example.com",
    occupation: null,
    address: null,
    avatar: null,
    accountStatus: "PENDING",
    isFirstLogin: true,
    lastLogin: null,
    createdAt: "2026-08-01T00:00:00.000Z",
    updatedAt: "2026-08-02T00:00:00.000Z",
    studentCount: 1,
    relationship: "MOTHER",
    students: [
      {
        id: "link-1",
        relationship: "MOTHER",
        student: {
          id: "student-1",
          studentId: "MURID-001",
          fullName: "Aina",
          avatar: null,
          class: { id: "class-1", className: "Bestari", yearLevel: 2, academicYear: 2026 },
        },
      },
    ],
  },
};

function renderDetail() {
  const detail = detailFixture.parent;
  return renderToStaticMarkup(
    <MemoryRouter>
      <TeacherParentDetailView
        detail={detail}
        statusPending={false}
        resendPending={false}
        onStatusChange={async () => true}
        onResendSetup={async () => undefined}
      />
    </MemoryRouter>,
  );
}

describe("Guru Ibu Bapa", () => {
  it("keeps the list on a single view-only action and removes duplicate email display", () => {
    const listSource = readFileSync(new URL("../src/features/teacher/components/TeacherParentList.tsx", import.meta.url), "utf8");

    expect(listSource).not.toContain("Edit ibu bapa");
    expect(listSource).not.toContain("editPath(parentId)");
    expect(listSource).toContain("aria-label={`Lihat ibu bapa ${fullName}`}");
    expect(listSource).toContain("Cari ibu bapa, e-mel, nama murid atau ID murid.");
    expect(listSource).toContain("Bilangan Anak");
    expect(listSource).toContain("Hubungan");
  });

  it("routes the real detail and edit pages with the shared breadcrumb and action pair", () => {
    const routes = readFileSync(new URL("../src/routes/index.tsx", import.meta.url), "utf8");
    const page = readFileSync(new URL("../src/features/teacher/pages/TeacherParentPages.tsx", import.meta.url), "utf8");

    expect(routes).toContain('path: "ibu-bapa/:parentId", element: <TeacherParentDetailPage />');
    expect(routes).toContain('path: "ibu-bapa/:parentId/edit", element: <TeacherParentEditPage />');
    expect(page).toContain('{ label: "Guru", to: "/guru" }');
    expect(page).toContain('{ label: "Ibu Bapa", to: "/guru/ibu-bapa" }');
    expect(page).toContain('title="Butiran Ibu Bapa"');
    expect(page).toContain('title="Edit Ibu Bapa"');
    expect(page).toContain("Edit Ibu Bapa");
    expect(page).toContain("Kembali");
  });

  it("renders the row-based parent detail shell with balanced sections and valid lifecycle text", () => {
    const markup = renderDetail();
    const source = readFileSync(new URL("../src/features/teacher/components/TeacherParentDetailView.tsx", import.meta.url), "utf8");

    expect(markup).toContain("Pn. Nana");
    expect(markup).toContain("nana@example.com");
    expect(markup).toContain("Ibu · 1 anak");
    expect(markup).toContain("Maklumat Ibu Bapa");
    expect(markup).toContain("Kawalan Akaun");
    expect(markup).toContain("Penyediaan Akaun");
    expect(markup).toContain("Anak Dipautkan");
    expect(markup).toContain("Zon Bahaya");
    expect(markup).toContain("Hantar Semula E-mel Setup");
    expect(markup).toContain("Lihat Murid");
    expect(markup).toContain("MURID-001");
    expect(markup).toContain("Menunggu");
    expect(markup).not.toContain("Maklumat Hubungan");
    expect(markup).not.toContain("Arkibkan Akaun");
    expect(source).toContain("grid items-stretch gap-6 lg:grid-cols-2");
    expect(source).toContain("flex h-full flex-col rounded-2xl");
    expect(source).toContain("mt-auto");
    expect(source).toContain("Status Akaun");
    expect(source).toContain("Status Penyediaan");
    expect(source).toContain("teacherParentSetupStatus");
  });

  it("normalizes labels without raw enums", () => {
    expect(teacherParentRelationshipLabel("FATHER")).toBe("Bapa");
    expect(teacherParentStatusLabel("SUSPENDED")).toBe("Digantung");
    expect(normalizeTeacherParentListResponse({ parents: [{ id: "1", fullName: "A", phone: "0123456789", accountStatus: "ACTIVE" }], pagination: { page: 1, limit: 10, total: 1, totalPages: 1, hasNextPage: false, hasPreviousPage: false } }).parents[0]?.fullName).toBe("A");
  });
});
