import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import {
  normalizeTeacherClassDetailResponse,
  normalizeTeacherClassStudentsResponse,
  teacherClassDisplayLabel,
  teacherClassStatusLabel,
} from "@/features/teacher/utils/teacher-class";

const detailSource = () => readFileSync(new URL("../src/features/teacher/pages/TeacherClassDetailPage.tsx", import.meta.url), "utf8");

describe("Guru Butiran Kelas", () => {
  it("routes the Lihat action to the real Butiran Kelas page", () => {
    const routes = readFileSync(new URL("../src/routes/index.tsx", import.meta.url), "utf8");
    const list = readFileSync(new URL("../src/features/teacher/components/TeacherClassList.tsx", import.meta.url), "utf8");

    expect(routes).toContain('import { TeacherClassDetailPage }');
    expect(routes).toContain('{ path: "kelas/:classId", element: <TeacherClassDetailPage /> }');
    expect(list).toContain('return `/guru/kelas/${id}`;');
    expect(list).toContain("aria-label={`Lihat kelas ${className}`}");
  });

  it("renders the production detail shell, breadcrumb, and enabled edit action", () => {
    const source = detailSource();

    expect(source).toContain('{ label: "Guru", to: "/guru" }');
    expect(source).toContain('{ label: "Kelas", to: "/guru/kelas" }');
    expect(source).toContain('{ label: "Butiran Kelas" }');
    expect(source).toContain('title="Butiran Kelas"');
    expect(source).toContain('description="Lihat dan urus maklumat kelas asal murid."');
    expect(source).toContain('to="/guru/kelas"');
    expect(source).toContain("Kembali");
    expect(source).toContain("Edit Kelas");
    expect(source).toContain("to={`/guru/kelas/${classId}/edit`}");
    expect(source).not.toContain("Edit Kelas belum tersedia");
    expect(source).not.toContain("<Button disabled");
  });

  it("keeps the summary compact without duplicate statistics", () => {
    const source = detailSource();
    const summaryStart = source.indexOf("function ClassSummaryCard");
    const summaryEnd = source.indexOf("function ClassInformationCard");
    const summary = source.slice(summaryStart, summaryEnd);

    expect(summary).toContain("<AdminAccountStatusBadge status={detail.accountStatus} />");
    expect(summary).not.toContain("Bilangan murid");
    expect(summary).not.toContain("studentCount");
    expect(summary).not.toContain("Terakhir dikemas kini");
    expect(summary).not.toContain("updatedAt");
  });

  it("uses equal-height row grids and implements teacher status controls without Zon Bahaya", () => {
    const source = detailSource();

    expect(source).toContain("grid items-stretch gap-6 lg:grid-cols-[2fr_1fr]");
    expect(source).toContain("flex h-full flex-col rounded-2xl");
    expect(source).toContain("mt-auto space-y-3 pt-6");
    expect(source).toContain("<ClassInformationCard detail={detail} />");
    expect(source).toContain("<ClassStatisticsCard detail={detail} />");
    expect(source).toContain("<StudentListCard students={studentsQuery.data?.students ?? []} isLoading={studentsQuery.isLoading} />");
    expect(source).toContain("<ClassControlCard");
    expect(source).toContain("onStatusChange={async (status) =>");
    expect(source).not.toContain("Zon Bahaya");
    expect(source).toContain("Arkibkan Kelas");
    expect(source).toContain("Aktifkan Semula");
    expect(source).toContain("Arkibkan kelas?");
    expect(source).toContain("Aktifkan semula kelas?");
    expect(source).not.toContain("Tindakan status dikendalikan oleh pentadbir.");
    expect(source).not.toContain("Hubungi pentadbir sekolah jika status kelas perlu dikemas kini.");
  });

  it("contains the required class detail sections and safe empty/error states", () => {
    const source = detailSource();

    expect(source).toContain("Kelas Asal");
    expect(source).toContain("Maklumat Kelas");
    expect(source).toContain("Nama Kelas");
    expect(source).toContain("Tahun");
    expect(source).toContain("Sesi Akademik");
    expect(source).toContain("Nama Paparan");
    expect(source).toContain("Tarikh Dicipta");
    expect(source).toContain("Terakhir Dikemas Kini");
    expect(source).toContain("Statistik Kelas");
    expect(source).toContain("Jumlah Murid");
    expect(source).toContain("Senarai Murid");
    expect(source).toContain("Belum ada murid didaftarkan dalam kelas ini.");
    expect(source).toContain("Kawalan Kelas");
    expect(source).toContain("Kelas tidak ditemui atau anda tidak mempunyai kebenaran untuk melihat rekod ini.");
    expect(source).toContain("Butiran kelas tidak dapat dimuatkan");
  });

  it("normalizes real class detail and student DTOs without mock data", () => {
    const detail = normalizeTeacherClassDetailResponse({
      class: {
        id: "33333333-3333-4333-8333-333333333333",
        schoolId: "11111111-1111-4111-8111-111111111111",
        teacherId: "22222222-2222-4222-8222-222222222222",
        className: "A",
        yearLevel: 1,
        academicYear: 2026,
        studentCount: 2,
        accountStatus: "ARCHIVED",
        createdAt: "2026-08-01T00:00:00.000Z",
        updatedAt: "2026-08-02T00:00:00.000Z",
        capacity: null,
        capacitySummary: { capacity: null, occupied: 2, availableSeats: null },
      },
    });
    const students = normalizeTeacherClassStudentsResponse({
      students: [{ id: "student-1", studentId: "M001", fullName: "Aina", accountStatus: "ACTIVE" }],
      pagination: { page: 1, limit: 5, total: 1, totalPages: 1, hasNextPage: false, hasPreviousPage: false },
    });

    expect(detail.class?.className).toBe("A");
    expect(detail.class?.yearLevel).toBe(1);
    expect(detail.class?.academicYear).toBe(2026);
    expect(detail.class?.studentCount).toBe(2);
    expect(detail.class?.accountStatus).toBe("ARCHIVED");
    expect(detail.class ? teacherClassDisplayLabel(detail.class) : "").toBe("1 A");
    expect(teacherClassStatusLabel("ARCHIVED")).toBe("Diarkibkan");
    expect(students.students).toEqual([{ id: "student-1", studentId: "M001", fullName: "Aina", accountStatus: "ACTIVE" }]);
  });
});
