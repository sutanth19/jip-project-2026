import { createBrowserRouter } from "react-router-dom"

import { DashboardPage } from "@/components/dashboard/DashboardPage"
import { ActivityPlayerPage } from "@/features/activity-player/ActivityPlayerPage"
import AuthLayout from "@/layouts/AuthLayout"
import { DashboardLayout } from "@/layouts/DashboardLayout"
import PublicLayout from "@/layouts/PublicLayout"
import LandingPage from "../pages/LandingPage"
import ForgotPasswordPage from "../pages/auth/ForgotPasswordPage"
import LoginPage from "../pages/auth/LoginPage"

const router = createBrowserRouter([
  {
    path: "/",
    element: <PublicLayout />,
    children: [
      {
        index: true,
        element: <LandingPage />,
      },
    ],
  },
  {
    path: "/login",
    element: <AuthLayout />,
    children: [
      {
        index: true,
        element: <LoginPage />,
      },
    ],
  },
  {
    path: "/forgot-password",
    element: <AuthLayout />,
    children: [
      {
        index: true,
        element: <ForgotPasswordPage />,
      },
    ],
  },
  {
    path: "/dashboard",
    element: <DashboardLayout />,
    children: [
      {
        index: true,
        element: <DashboardPage />,
      },
      {
        path: "sekolah",
        element: <DashboardPage />,
      },
      {
        path: "guru",
        element: <DashboardPage />,
      },
      {
        path: "kurikulum",
        element: <DashboardPage />,
      },
      {
        path: "kurikulum/mata-pelajaran",
        element: <DashboardPage />,
      },
      {
        path: "kurikulum/tahun",
        element: <DashboardPage />,
      },
      {
        path: "kurikulum/kemahiran",
        element: <DashboardPage />,
      },
      {
        path: "kurikulum/standard-kandungan",
        element: <DashboardPage />,
      },
      {
        path: "kurikulum/standard-pembelajaran",
        element: <DashboardPage />,
      },
      {
        path: "aktiviti",
        element: <DashboardPage />,
      },
      {
        path: "aktiviti/create",
        element: <DashboardPage />,
      },
      {
        path: "jenis-aktiviti",
        element: <DashboardPage />,
      },
      {
        path: "semakan",
        element: <DashboardPage />,
      },
      {
        path: "laporan",
        element: <DashboardPage />,
      },
      {
        path: "pengumuman",
        element: <DashboardPage />,
      },
      {
        path: "tetapan",
        element: <DashboardPage />,
      },
    ],
  },
  {
    path: "/aktiviti/:activityId/mainkan",
    element: <ActivityPlayerPage />,
  },
])

export default router;
