import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("Dashboard sidebar visibility", () => {
  it("keeps the requested Teacher navigation items hidden while leaving Aktiviti available for the teacher library", () => {
    const sidebar = readFileSync(new URL("../src/components/dashboard/Sidebar.tsx", import.meta.url), "utf8");

    expect(sidebar).toContain('const temporarilyHiddenTeacherNavTitles = new Set([');
    expect(sidebar).toContain('"PBD"');
    expect(sidebar).toContain('"Laporan"');
    expect(sidebar).toContain('"Notifikasi"');
    expect(sidebar).toContain('"Pengumuman"');
    expect(sidebar).toContain('"Draf AI"');
    expect(sidebar).toContain('"Profil"');
    expect(sidebar).toContain('"Kurikulum Pemulihan"');
    expect(sidebar).toContain('"Jenis Aktiviti"');
    expect(sidebar).toContain('"Bank Soalan"');
    expect(sidebar).toContain('"Analitik & Laporan"');
    expect(sidebar).toContain('role !== "TEACHER"');
    expect(sidebar).toContain('role !== "ADMIN" && role !== "SUPER_ADMIN"');
    expect(sidebar).toContain('Temporarily hidden from TEACHER navigation.');
    expect(sidebar).toContain('Temporarily hidden from ADMIN/SUPER_ADMIN navigation.');
    expect(sidebar).toContain('roles: ["SUPER_ADMIN", "ADMIN", "TEACHER", "PARENT"]');
    expect(sidebar).toContain('title: "Kelas", url: "/guru/kelas"');
    expect(sidebar).toContain('title: "Murid", url: "/guru/murid"');
    expect(sidebar).toContain('title: "Aktiviti"');
    expect(sidebar).toContain('url: "/guru/aktiviti"');
    expect(sidebar).toContain('roles: ["TEACHER"]');
  });
});
