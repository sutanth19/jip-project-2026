import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { MemoryRouter } from "react-router-dom";

import {
  TeacherDetailErrorState,
  TeacherDetailSkeleton,
  TeacherDetailView,
} from "@/features/admin/components/TeacherDetailView";
import {
  canArchiveTeacher,
  canResendTeacherSetup,
  formatTeacherDateTime,
  getTeacherLifecycleAction,
  normalizeTeacherDetailRecord,
} from "@/features/admin/utils/teacher-detail";

const teacherPayload = {
  teacher: {
    id: "33333333-3333-4333-8333-333333333333",
    userId: "77777777-7777-4777-8777-777777777777",
    schoolId: "11111111-1111-4111-8111-111111111111",
    teacherId: "GURU001",
    fullName: "Cikgu Aisyah",
    email: "aisyah@example.edu.my",
    phone: "0123456789",
    avatar: "/api/media/files/avatar/guru.png",
    accountStatus: "ACTIVE",
    isFirstLogin: true,
    lastLogin: "2026-08-01T08:00:00.000Z",
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
    assignedClasses: [],
    studentCount: 0,
  },
};

function renderDetail(payload = teacherPayload.teacher, role: "SUPER_ADMIN" | "ADMIN" = "SUPER_ADMIN") {
  const detail = normalizeTeacherDetailRecord(payload);
  if (!detail) throw new Error("Invalid teacher detail fixture");

  return renderToStaticMarkup(
    <MemoryRouter>
      <TeacherDetailView
        detail={detail}
        currentRole={role}
        statusPending={false}
        resendPending={false}
        onStatusChange={async () => true}
        onResendSetup={() => undefined}
        onArchive={async () => true}
      />
    </MemoryRouter>,
  );
}

describe("Butiran Guru detail page", () => {
  it("uses the real Guru detail route branch with the requested page header actions", () => {
    const routes = readFileSync(new URL("../src/routes/index.tsx", import.meta.url), "utf8");
    const page = readFileSync(new URL("../src/features/admin/pages/AdminEntityDetailPage.tsx", import.meta.url), "utf8");
    const api = readFileSync(new URL("../src/features/admin/api/admin.api.ts", import.meta.url), "utf8");
    const config = readFileSync(new URL("../src/features/admin/config.ts", import.meta.url), "utf8");

    expect(routes).toContain('path: "guru/:id", element: <AdminEntityDetailPage entityKey="teachers" />');
    expect(page).toContain('if (entityKey === "teachers")');
    expect(page).toContain("TeacherDetailView");
    expect(page).toContain('title="Butiran Guru"');
    expect(page).toContain('description="Lihat dan urus maklumat akaun guru platform Digital Main-LiT."');
    expect(page).toContain("Edit Guru");
    expect(page).toContain("`${detailPath}/edit`");
    expect(page).toContain("Kembali");
    expect(config).toContain('key: "teachers"');
    expect(config).toContain('endpoint: "/teachers"');
    expect(api).toContain('`${config.endpoint}/${id}/resend-setup`');
  });

  it("normalizes the safe teacher-detail response and derives setup state without exposing secrets", () => {
    const detail = normalizeTeacherDetailRecord(teacherPayload);

    expect(detail?.id).toBe(teacherPayload.teacher.id);
    expect(detail?.fullName).toBe("Cikgu Aisyah");
    expect(detail?.teacherId).toBe("GURU001");
    expect(detail?.email).toBe("aisyah@example.edu.my");
    expect(detail?.accountStatus).toBe("ACTIVE");
    expect(detail?.setupStatus).toBe("PENDING");
    expect(detail?.school?.schoolName).toBe("SJKT Taman Harmoni");
    expect(detail?.school?.principalName).toBe("Puan Devi");
    expect(JSON.stringify(detail)).not.toContain("setupToken");
    expect(JSON.stringify(detail)).not.toContain("passwordHash");
    expect(JSON.stringify(detail)).not.toContain("passwordResetToken");
  });

  it("renders profile summary, account information, school information, controls, setup, and danger zone", () => {
    const markup = renderDetail();
    const text = markup.replace(/<[^>]+>/g, "");

    expect(markup).toContain("Cikgu Aisyah");
    expect(markup).toContain("Guru");
    expect(markup).toContain("GURU001");
    expect(markup).toContain("Aktif");
    expect(markup).toContain("Log masuk terakhir");
    expect(markup).toContain("Maklumat Akaun");
    expect(markup).toContain("aisyah@example.edu.my");
    expect(markup).toContain("0123456789");
    expect(markup).toContain("ID Guru");
    expect(markup).toContain("Tarikh Dicipta");
    expect(markup).toContain("Terakhir Dikemas Kini");
    expect(markup).toContain("Maklumat Sekolah");
    expect(markup).toContain("SJKT Taman Harmoni");
    expect(markup).toContain("SJKT200");
    expect(text.indexOf("SJKT200")).toBeGreaterThan(text.indexOf("SJKT Taman Harmoni"));
    expect(markup).toContain("Puan Devi");
    expect(markup).toContain("tamanharmoni@school.edu.my");
    expect(markup).toContain("0187654321");
    expect(markup).toContain("Kawalan Akaun");
    expect(markup).toContain("Gantung Akaun");
    expect(markup).toContain("Penyediaan Akaun");
    expect(markup).toContain("Menunggu Setup");
    expect(markup).toContain("Hantar Semula Setup");
    expect(markup).toContain("Guru masih belum melengkapkan penyediaan akaun.");
    expect(markup).toContain("Zon Bahaya");
    expect(markup).toContain("Arkibkan Guru");
    expect(markup).not.toContain("setup-password");
    expect(markup).not.toContain("setupToken");
    expect(markup).not.toContain("passwordHash");
  });

  it("centers the school identity and keeps school information ordered without duplicating school code", () => {
    const markup = renderDetail();
    const source = readFileSync(new URL("../src/features/admin/components/TeacherDetailView.tsx", import.meta.url), "utf8");
    const text = markup.replace(/<[^>]+>/g, "");

    expect(markup).toContain('alt="Logo SJKT Taman Harmoni"');
    expect(source).toContain('className="flex flex-col items-center text-center"');
    expect(source).toContain('className="mt-4 min-w-0"');
    expect(source).toContain('className="break-words text-xl font-semibold leading-snug text-foreground"');
    expect(source).toContain('className="grid gap-5 border-t border-border pt-6 md:grid-cols-2"');
    const schoolSectionStart = text.indexOf("Maklumat Sekolah");
    const principalIndex = text.indexOf("Nama Pengetua", schoolSectionStart);
    const emailIndex = text.indexOf("E-mel Perhubungan", schoolSectionStart);
    const phoneIndex = text.indexOf("Nombor Telefon", principalIndex);
    expect(principalIndex).toBeGreaterThan(schoolSectionStart);
    expect(principalIndex).toBeLessThan(emailIndex);
    expect(emailIndex).toBeLessThan(phoneIndex);
    expect(source).toContain('value={availableLabel(school.principalName)}');
    expect(source).toContain('value={availableLabel(school.contactEmail)}');
    expect(source).toContain('value={availableLabel(school.phone)}');
    expect(source).toContain("school.schoolCode");
    expect(source).not.toContain('label="Kod Sekolah"');
  });

  it("uses independent equal-height grid rows instead of permanent left and right columns", () => {
    const source = readFileSync(new URL("../src/features/admin/components/TeacherDetailView.tsx", import.meta.url), "utf8");

    expect(source).toContain('className="grid items-stretch gap-6 lg:grid-cols-[2fr_1fr]"');
    expect(source).toContain('<TeacherAccountInformationCard detail={detail} className="h-full" />');
    expect(source).toContain("<TeacherAccountControlCard");
    expect(source).toContain('<TeacherSchoolCard school={detail.school} className="h-full" />');
    expect(source).toContain("<TeacherSetupCard");
    expect(source).toContain('CardContent className="flex h-full flex-col p-0"');
    expect(source).toContain('className="mt-auto border-t border-border pt-5"');
    expect(source).toContain('className="mt-auto"');
    expect(source).not.toContain("lg:grid-cols-[minmax(0,1fr)_360px]");
  });

  it("renders the completed setup state with a real completion date only when supplied", () => {
    const completedAt = "2026-08-03T13:11:00.000Z";
    const markup = renderDetail({
      ...teacherPayload.teacher,
      isFirstLogin: false,
      setupCompletedAt: completedAt,
    });

    expect(markup).toContain("Selesai");
    expect(markup).toContain("Guru telah melengkapkan penyediaan akaun dan sedia menggunakan sistem.");
    expect(markup).toContain("Tarikh Selesai");
    expect(markup).toContain(formatTeacherDateTime(completedAt));
    expect(markup).not.toContain("Hantar Semula Setup");
  });

  it("renders fallbacks for null phone, null last login, initials, completed setup, and missing school", () => {
    const detail = normalizeTeacherDetailRecord({
      ...teacherPayload.teacher,
      phone: null,
      avatar: null,
      isFirstLogin: false,
      lastLogin: null,
      school: null,
    });
    if (!detail) throw new Error("Invalid teacher detail fixture");

    const markup = renderToStaticMarkup(
      <MemoryRouter>
        <TeacherDetailView
          detail={detail}
          currentRole="ADMIN"
          statusPending={false}
          resendPending={false}
          onStatusChange={async () => true}
          onResendSetup={() => undefined}
          onArchive={async () => true}
        />
      </MemoryRouter>,
    );

    expect(markup).toContain("Belum pernah log masuk");
    expect(markup).toContain("—");
    expect(markup).toContain("CA");
    expect(markup).toContain("Selesai");
    expect(markup).toContain("Guru telah melengkapkan penyediaan akaun dan sedia menggunakan sistem.");
    expect(markup).toContain("Tarikh selesai tidak tersedia dalam rekod semasa.");
    expect(markup).not.toContain("Tarikh Selesai");
    expect(markup).not.toContain("Hantar Semula Setup");
    expect(markup).toContain("Tiada sekolah ditetapkan");
    expect(markup).toContain("Guru ini belum dipautkan kepada mana-mana sekolah.");
    expect(markup).not.toContain("Lihat Sekolah");
  });

  it("keeps the school navigation action full width with a direction icon and the correct route", () => {
    const markup = renderDetail();
    const source = readFileSync(new URL("../src/features/admin/components/TeacherDetailView.tsx", import.meta.url), "utf8");

    expect(markup).toContain('href="/admin/sekolah/11111111-1111-4111-8111-111111111111"');
    expect(markup).toContain("Lihat Sekolah");
    expect(source).toContain('className="h-11 w-full justify-between rounded-xl px-5 focus-visible:ring-primary/30"');
    expect(source).toContain('className="mt-auto pt-6"');
    expect(source).toContain("ChevronRight");
  });

  it("wraps long school identity and contact values safely", () => {
    const source = readFileSync(new URL("../src/features/admin/components/TeacherDetailView.tsx", import.meta.url), "utf8");
    const markup = renderDetail({
      ...teacherPayload.teacher,
      school: {
        ...teacherPayload.teacher.school,
        schoolName: "Sekolah Jenis Kebangsaan Tamil Taman Harmoni Malaysia",
        contactEmail: "pentadbiran.sekolah.taman.harmoni.literasi.digital@school.edu.my",
      },
    });

    expect(markup).toContain("Sekolah Jenis Kebangsaan Tamil Taman Harmoni Malaysia");
    expect(markup).toContain("pentadbiran.sekolah.taman.harmoni.literasi.digital@school.edu.my");
    expect(source).toContain("break-words");
    expect(source).toContain("md:grid-cols-2");
  });

  it("keeps lifecycle capabilities aligned to the backend policy", () => {
    const pending = normalizeTeacherDetailRecord({ ...teacherPayload.teacher, accountStatus: "PENDING" });
    const suspended = normalizeTeacherDetailRecord({ ...teacherPayload.teacher, accountStatus: "SUSPENDED" });
    const archived = normalizeTeacherDetailRecord({ ...teacherPayload.teacher, accountStatus: "ARCHIVED" });

    expect(getTeacherLifecycleAction("ACTIVE", "ADMIN")?.label).toBe("Gantung Akaun");
    expect(getTeacherLifecycleAction("SUSPENDED", "ADMIN")?.label).toBe("Nyahgantung Akaun");
    expect(getTeacherLifecycleAction("ARCHIVED", "ADMIN")).toBeNull();
    expect(getTeacherLifecycleAction("ARCHIVED", "SUPER_ADMIN")?.label).toBe("Pulihkan Akaun");
    expect(pending ? canArchiveTeacher(pending) : true).toBe(false);
    expect(suspended ? canArchiveTeacher(suspended) : false).toBe(true);
    expect(archived ? canResendTeacherSetup(archived) : true).toBe(false);
  });

  it("renders loading, error, not-found copy, and confirmation strings safely", () => {
    const skeleton = renderToStaticMarkup(<TeacherDetailSkeleton />);
    const error = renderToStaticMarkup(
      <MemoryRouter>
        <TeacherDetailErrorState title="Butiran guru tidak dapat dimuatkan" description="Sila cuba lagi." path="/admin/guru" onRetry={() => undefined} />
      </MemoryRouter>,
    );
    const source = readFileSync(new URL("../src/features/admin/components/TeacherDetailView.tsx", import.meta.url), "utf8");
    const page = readFileSync(new URL("../src/features/admin/pages/AdminEntityDetailPage.tsx", import.meta.url), "utf8");
    const utility = readFileSync(new URL("../src/features/admin/utils/teacher-detail.ts", import.meta.url), "utf8");

    expect(skeleton).toContain("aria-busy=\"true\"");
    expect(skeleton).toContain("Memuatkan butiran guru");
    expect(error).toContain("Butiran guru tidak dapat dimuatkan");
    expect(error).toContain("Sila cuba lagi.");
    expect(error).toContain("Kembali ke Senarai Guru");
    expect(page).toContain("Guru tidak ditemui");
    expect(page).toContain("Rekod guru ini tidak wujud atau telah dipadamkan.");
    expect(utility).toContain("Gantung akaun guru?");
    expect(source).toContain("Arkibkan guru?");
    expect(source).toContain("disabled={pending}");
    expect(source).toContain('pending ? "Menghantar..." : "Hantar Semula Setup"');
    expect(page).toContain("invitation.status");
    expect(page).toContain("E-mel penyediaan telah dihantar semula.");
    expect(page).toContain("E-mel penyediaan tidak dapat dihantar");
    expect(source).not.toContain("developmentSetupUrl");
    expect(source).not.toContain("setup-password?token");
  });
});
