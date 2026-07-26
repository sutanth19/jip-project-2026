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
  School,
  Settings,
  Shapes,
  Target,
} from "lucide-react"

const data = {
  user: {
    name: "Pentadbir IPG",
    email: "admin@digitalmolib.my",
    avatar: "",
  },
  teams: [
    {
      name: "Digital MoLIB",
      logo: (
              <School
              />
      ),
      plan: "IPG Kampus Darul Aman",
    },
  ],
  navMain: [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: (
        <LayoutDashboard
        />
      ),
    },
    {
      title: "Pengurusan Sekolah",
      url: "/dashboard/sekolah",
      icon: (
        <School
        />
      ),
    },
    {
      title: "Pengurusan Guru",
      url: "/dashboard/guru",
      icon: (
        <GraduationCap
        />
      ),
    },
    {
      title: "Kurikulum Pemulihan",
      url: "#",
      icon: (
        <BookOpenCheck
        />
      ),
      isActive: true,
      items: [
        {
          title: "Mata Pelajaran",
          url: "/dashboard/kurikulum/mata-pelajaran",
          icon: <BookOpen />,
        },
        {
          title: "Tahun",
          url: "/dashboard/kurikulum/tahun",
          icon: <CalendarRange />,
        },
        {
          title: "Kemahiran Pemulihan",
          url: "/dashboard/kurikulum/kemahiran",
          icon: <Brain />,
        },
        {
          title: "Standard Kandungan",
          url: "/dashboard/kurikulum/standard-kandungan",
          icon: <ListTree />,
        },
        {
          title: "Standard Pembelajaran",
          url: "/dashboard/kurikulum/standard-pembelajaran",
          icon: <Target />,
        },
      ],
    },
    {
      title: "Bank Aktiviti Digital",
      url: "/dashboard/aktiviti",
      icon: <LibraryBig />,
    },
    {
      title: "Jenis Aktiviti",
      url: "/dashboard/jenis-aktiviti",
      icon: <Shapes />,
    },
    {
      title: "Semakan & Penerbitan",
      url: "/dashboard/semakan",
      icon: <BadgeCheck />,
    },
    {
      title: "Analitik & Laporan",
      url: "/dashboard/laporan",
      icon: <ChartNoAxesCombined />,
    },
    {
      title: "Pengumuman",
      url: "/dashboard/pengumuman",
      icon: <Megaphone />,
    },
    {
      title: "Tetapan Sistem",
      url: "/dashboard/tetapan",
      icon: <Settings />,
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher teams={data.teams} />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
