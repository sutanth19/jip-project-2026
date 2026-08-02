"use client"

import * as React from "react"

import { NavMain } from "@/components/dashboard/SidebarNav"
import { NavUser } from "@/components/dashboard/SidebarUser"
import { TeamSwitcher } from "@/components/dashboard/SchoolSwitcher"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar"
import {
  BadgeCheck,
  Brain,
  BookOpen,
  BookOpenCheck,
  CalendarRange,
  ChartNoAxesCombined,
  GraduationCap,
  LayoutDashboard,
  LibraryBig,
  ListTree,
  Megaphone,
  Send,
  School,
  Settings,
  Shapes,
  Target,
  UserCog,
  Users,
} from "lucide-react"
import { useAuthStore } from "@/stores/auth-store"
import type { AuthRole } from "@/types/auth"
import { roleLabels } from "@/utils/permissions"

type NavItem = {
  title: string
  url: string
  icon: React.ReactNode
  roles: AuthRole[]
  isActive?: boolean
  items?: {
    title: string
    url: string
    icon?: React.ReactNode
    roles: AuthRole[]
  }[]
}

const navMain: NavItem[] = [
    {
      title: "Dashboard Admin",
      url: "/admin",
      icon: (
        <LayoutDashboard
        />
      ),
      roles: ["SUPER_ADMIN", "ADMIN"],
    },
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: (
        <LayoutDashboard
        />
      ),
      roles: ["TEACHER", "STUDENT", "PARENT"],
    },
    { title: "Utama Murid", url: "/murid", icon: <LayoutDashboard />, roles: ["STUDENT"] },
    { title: "Tugasan Saya", url: "/murid/tugasan", icon: <BookOpen />, roles: ["STUDENT"] },
    { title: "Penghantaran", url: "/murid/penghantaran", icon: <Send />, roles: ["STUDENT"] },
    { title: "Keputusan", url: "/murid/penilaian", icon: <Target />, roles: ["STUDENT"] },
    { title: "Kemajuan", url: "/murid/kemajuan", icon: <ChartNoAxesCombined />, roles: ["STUDENT"] },
    { title: "Notifikasi Murid", url: "/murid/notifikasi", icon: <BadgeCheck />, roles: ["STUDENT"] },
    { title: "Utama Ibu Bapa", url: "/ibu-bapa", icon: <LayoutDashboard />, roles: ["PARENT"] },
    { title: "Anak Saya", url: "/ibu-bapa/anak", icon: <Users />, roles: ["PARENT"] },
    { title: "Tugasan Anak", url: "/ibu-bapa/tugasan", icon: <BookOpen />, roles: ["PARENT"] },
    { title: "Penghantaran Anak", url: "/ibu-bapa/penghantaran", icon: <Send />, roles: ["PARENT"] },
    { title: "Keputusan Anak", url: "/ibu-bapa/keputusan", icon: <Target />, roles: ["PARENT"] },
    { title: "Kemajuan Anak", url: "/ibu-bapa/pbd", icon: <ChartNoAxesCombined />, roles: ["PARENT"] },
    { title: "Laporan Anak", url: "/ibu-bapa/laporan", icon: <BookOpenCheck />, roles: ["PARENT"] },
    { title: "Notifikasi Ibu Bapa", url: "/ibu-bapa/notifikasi", icon: <BadgeCheck />, roles: ["PARENT"] },
    { title: "Profil Ibu Bapa", url: "/ibu-bapa/profil", icon: <UserCog />, roles: ["PARENT"] },
    { title: "Kelas Saya", url: "/guru/kelas", icon: <School />, roles: ["TEACHER"] },
    { title: "Murid Saya", url: "/guru/murid", icon: <Users />, roles: ["TEACHER"] },
    { title: "Tugasan", url: "/guru/tugasan", icon: <CalendarRange />, roles: ["TEACHER"] },
    { title: "Penghantaran", url: "/guru/penghantaran", icon: <BadgeCheck />, roles: ["TEACHER"] },
    { title: "Penilaian", url: "/guru/penilaian", icon: <Target />, roles: ["TEACHER"] },
    { title: "PBD", url: "/guru/pbd", icon: <BookOpenCheck />, roles: ["TEACHER"] },
    { title: "Laporan", url: "/guru/laporan", icon: <ChartNoAxesCombined />, roles: ["TEACHER"] },
    { title: "Notifikasi", url: "/guru/notifikasi", icon: <Send />, roles: ["TEACHER"] },
    { title: "Pengumuman", url: "/guru/pengumuman", icon: <Megaphone />, roles: ["TEACHER"] },
    { title: "Draf AI", url: "/guru/ai", icon: <Brain />, roles: ["TEACHER"] },
    { title: "Profil", url: "/guru/profil", icon: <UserCog />, roles: ["TEACHER"] },
    {
      title: "Pengurusan Sekolah",
      url: "/admin/sekolah",
      icon: (
        <School
        />
      ),
      roles: ["SUPER_ADMIN", "ADMIN"],
    },
    {
      title: "Pengurusan Pentadbir",
      url: "/admin/pentadbir",
      icon: <UserCog />,
      roles: ["SUPER_ADMIN"],
    },
    {
      title: "Pengurusan Guru",
      url: "/admin/guru",
      icon: (
        <GraduationCap
        />
      ),
      roles: ["SUPER_ADMIN", "ADMIN"],
    },
    {
      title: "Pengurusan Murid",
      url: "/admin/murid",
      icon: <Users />,
      roles: ["SUPER_ADMIN", "ADMIN"],
    },
    {
      title: "Pengurusan Ibu Bapa",
      url: "/admin/ibu-bapa",
      icon: <Users />,
      roles: ["SUPER_ADMIN", "ADMIN"],
    },
    {
      title: "Pengurusan Kelas",
      url: "/admin/kelas",
      icon: <School />,
      roles: ["SUPER_ADMIN", "ADMIN"],
    },
    {
      title: "Kurikulum Pemulihan",
      url: "/curriculum",
      icon: (
        <BookOpenCheck
        />
      ),
      isActive: true,
      roles: ["SUPER_ADMIN", "ADMIN", "TEACHER"],
      items: [
        {
          title: "Mata Pelajaran",
          url: "/curriculum/programmes",
          icon: <BookOpen />,
          roles: ["SUPER_ADMIN", "ADMIN", "TEACHER"],
        },
        {
          title: "Tahun",
          url: "/curriculum/years",
          icon: <CalendarRange />,
          roles: ["SUPER_ADMIN", "ADMIN", "TEACHER"],
        },
        {
          title: "Kemahiran Pemulihan",
          url: "/curriculum/remedial-skills",
          icon: <Brain />,
          roles: ["SUPER_ADMIN", "ADMIN", "TEACHER"],
        },
        {
          title: "Standard Kandungan",
          url: "/curriculum/content-standards",
          icon: <ListTree />,
          roles: ["SUPER_ADMIN", "ADMIN", "TEACHER"],
        },
        {
          title: "Standard Pembelajaran",
          url: "/curriculum/learning-standards",
          icon: <Target />,
          roles: ["SUPER_ADMIN", "ADMIN", "TEACHER"],
        },
      ],
    },
    {
      title: "Bank Aktiviti Digital",
      url: "/admin/tugasan",
      icon: <LibraryBig />,
      roles: ["SUPER_ADMIN", "ADMIN"],
    },
    {
      title: "Aktiviti",
      url: "/digital-activities",
      icon: <LibraryBig />,
      roles: ["TEACHER", "STUDENT"],
    },
    {
      title: "Jenis Aktiviti",
      url: "/activity-templates",
      icon: <Shapes />,
      roles: ["SUPER_ADMIN", "ADMIN", "TEACHER"],
    },
    {
      title: "Bank Soalan",
      url: "/question-bank",
      icon: <LibraryBig />,
      roles: ["SUPER_ADMIN", "ADMIN", "TEACHER"],
    },
    {
      title: "Semakan & Penerbitan",
      url: "/admin/penghantaran",
      icon: <BadgeCheck />,
      roles: ["SUPER_ADMIN", "ADMIN"],
    },
    {
      title: "Penilaian",
      url: "/admin/penilaian",
      icon: <Target />,
      roles: ["SUPER_ADMIN", "ADMIN"],
    },
    {
      title: "PBD",
      url: "/admin/pbd",
      icon: <BookOpenCheck />,
      roles: ["SUPER_ADMIN", "ADMIN"],
    },
    {
      title: "Analitik & Laporan",
      url: "/admin/laporan",
      icon: <ChartNoAxesCombined />,
      roles: ["SUPER_ADMIN", "ADMIN", "TEACHER", "PARENT"],
    },
    {
      title: "Pengumuman",
      url: "/admin/pengumuman",
      icon: <Megaphone />,
      roles: ["SUPER_ADMIN", "ADMIN"],
    },
    {
      title: "Notifikasi",
      url: "/admin/notifikasi",
      icon: <Send />,
      roles: ["SUPER_ADMIN", "ADMIN"],
    },
    {
      title: "Draf AI",
      url: "/admin/ai",
      icon: <Brain />,
      roles: ["SUPER_ADMIN", "ADMIN"],
    },
    {
      title: "Audit Log",
      url: "/admin/audit",
      icon: <BadgeCheck />,
      roles: ["SUPER_ADMIN", "ADMIN"],
    },
    {
      title: "Tetapan Sistem",
      url: "/admin/tetapan",
      icon: <Settings />,
      roles: ["SUPER_ADMIN", "ADMIN"],
    },
  ]

function canView(roles: AuthRole[], role: AuthRole | null) {
  return Boolean(role && roles.includes(role))
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const user = useAuthStore((state) => state.user)
  const profile = useAuthStore((state) => state.profile)
  const role = useAuthStore((state) => state.role)
  const school = useAuthStore((state) => state.school)
  const visibleNav = React.useMemo(
    () =>
      navMain
        .filter((item) => canView(item.roles, role))
        .map((item) => ({
          ...item,
          items: item.items?.filter((subItem) => canView(subItem.roles, role)),
        })),
    [role]
  )
  const displayName = profile && "fullName" in profile ? profile.fullName : "Pengguna"
  const displayEmail = user?.email ?? (role ? roleLabels[role] : "Akaun")

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher
          teams={[
            {
              name: "LITERASI DIGITAL",
              logo: <School />,
              plan: school?.name ?? school?.id ?? "Semua sekolah",
            },
          ]}
        />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={visibleNav} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={{ name: displayName, email: displayEmail, avatar: "" }} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
