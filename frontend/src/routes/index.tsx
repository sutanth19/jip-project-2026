import { createBrowserRouter } from "react-router-dom"

import { DashboardPage } from "@/components/dashboard/DashboardPage"
import { ActivityPlayerPage } from "@/features/activity-player/ActivityPlayerPage"
import { AppProviders } from "@/providers/AppProviders"
import { AccessDeniedPage, NotFoundPage, OfflinePage, ServerErrorPage, UnauthorizedPage } from "@/pages/errors/ErrorPage"
import AuthLayout from "@/layouts/AuthLayout"
import { AdminLayout } from "@/layouts/AdminLayout"
import { DashboardLayout } from "@/layouts/DashboardLayout"
import { ParentLayout } from "@/layouts/ParentLayout"
import PublicLayout from "@/layouts/PublicLayout"
import { StudentLayout } from "@/layouts/StudentLayout"
import { TeacherLayout } from "@/layouts/TeacherLayout"
import LandingPage from "../pages/LandingPage"
import ForgotPasswordPage from "../pages/auth/ForgotPasswordPage"
import LoginPage from "../pages/auth/LoginPage"
import ChangeFirstPasswordPage from "@/pages/auth/ChangeFirstPasswordPage"
import ChangeFirstPinPage from "@/pages/auth/ChangeFirstPinPage"
import SetupPasswordPage from "@/pages/auth/SetupPasswordPage"
import { RequireAdmin, RequireAuth, RequireParent, RequireRole, RequireStudent, RequireTeacher } from "@/routes/guards"
import { AdminDashboardPage } from "@/features/admin/pages/AdminDashboardPage"
import { AdminEntityDetailPage } from "@/features/admin/pages/AdminEntityDetailPage"
import { AdminEntityFormPage } from "@/features/admin/pages/AdminEntityFormPage"
import { AdminEntityListPage } from "@/features/admin/pages/AdminEntityListPage"
import { AdminProfilePage } from "@/features/admin/pages/AdminProfilePage"
import { AdminReportsPage } from "@/features/admin/pages/AdminReportsPage"
import { AdminSettingsPage } from "@/features/admin/pages/AdminSettingsPage"
import { BuilderDetailPage } from "@/features/builder/pages/BuilderDetailPage"
import { BuilderFormPage } from "@/features/builder/pages/BuilderFormPage"
import { BuilderListPage } from "@/features/builder/pages/BuilderListPage"
import { CurriculumHomePage } from "@/features/builder/pages/CurriculumHomePage"
import { CurriculumNestedPage } from "@/features/builder/pages/CurriculumNestedPage"
import { DigitalActivityPreviewPage } from "@/features/builder/pages/DigitalActivityPreviewPage"
import { TeacherAssignmentFormPage, TeacherDashboardPage, TeacherDetailPage, TeacherListPage, TeacherPbdPage, TeacherProfilePage, TeacherReportsPage } from "@/features/teacher/pages/TeacherPages"
import { StudentAssignmentDetailPage, StudentDashboardPage, StudentDetailPage, StudentListPage, StudentPlayerPage, StudentProgressPage } from "@/features/student/pages/StudentPages"
import { ParentChildPage, ParentChildListPage, ParentChildrenPage, ParentDashboardPage, ParentProfilePage, ParentProgressPage, ParentReportPage, ParentSimpleListPage } from "@/features/parent/pages/ParentPages"
import { NotificationCentrePage, NotificationPreferencesPage } from "@/features/notifications/pages/NotificationPages"
import { AiDraftGeneratorPage, AiOutputDetailPage, AiOutputListPage } from "@/features/ai/pages/AiPages"

const router = createBrowserRouter([
  {
    path: "/",
    element: <AppProviders />,
    errorElement: <ServerErrorPage />,
    children: [
      {
        element: <PublicLayout />,
        children: [
          {
            index: true,
            element: <LandingPage />,
          },
        ],
      },
      {
        path: "login",
        element: <AuthLayout />,
        children: [
          {
            index: true,
            element: <LoginPage />,
          },
        ],
      },
      {
        path: "forgot-password",
        element: <AuthLayout />,
        children: [
          {
            index: true,
            element: <ForgotPasswordPage />,
          },
        ],
      },
      {
        path: "setup-password",
        element: <AuthLayout />,
        children: [
          {
            index: true,
            element: <SetupPasswordPage />,
          },
        ],
      },
      {
        path: "change-first-password",
        element: (
          <RequireAuth>
            <AuthLayout />
          </RequireAuth>
        ),
        children: [
          {
            index: true,
            element: <ChangeFirstPasswordPage />,
          },
        ],
      },
      {
        path: "student/change-first-pin",
        element: (
          <RequireAuth>
            <AuthLayout />
          </RequireAuth>
        ),
        children: [
          {
            index: true,
            element: <ChangeFirstPinPage />,
          },
        ],
      },
      {
        path: "401",
        element: <UnauthorizedPage />,
      },
      {
        path: "403",
        element: <AccessDeniedPage />,
      },
      {
        path: "500",
        element: <ServerErrorPage />,
      },
      {
        path: "offline",
        element: <OfflinePage />,
      },
      {
        path: "curriculum",
        element: (
          <RequireRole roles={["SUPER_ADMIN", "ADMIN", "TEACHER"]}>
            <DashboardLayout />
          </RequireRole>
        ),
        children: [
          { index: true, element: <CurriculumHomePage /> },
          { path: "versions", element: <BuilderListPage entityKey="curriculumVersions" /> },
          { path: "versions/create", element: <RequireRole roles={["SUPER_ADMIN", "ADMIN"]}><BuilderFormPage entityKey="curriculumVersions" mode="create" /></RequireRole> },
          { path: "versions/:id", element: <BuilderDetailPage entityKey="curriculumVersions" /> },
          { path: "versions/:id/edit", element: <RequireRole roles={["SUPER_ADMIN", "ADMIN"]}><BuilderFormPage entityKey="curriculumVersions" mode="edit" /></RequireRole> },
          { path: "version/:versionId", element: <BuilderDetailPage entityKey="curriculumVersions" /> },
          { path: "programmes", element: <BuilderListPage entityKey="programmes" /> },
          { path: "programmes/create", element: <RequireRole roles={["SUPER_ADMIN", "ADMIN"]}><BuilderFormPage entityKey="programmes" mode="create" /></RequireRole> },
          { path: "programmes/:id", element: <BuilderDetailPage entityKey="programmes" /> },
          { path: "programmes/:id/edit", element: <RequireRole roles={["SUPER_ADMIN", "ADMIN"]}><BuilderFormPage entityKey="programmes" mode="edit" /></RequireRole> },
          { path: "years", element: <CurriculumNestedPage kind="years" /> },
          { path: "remedial-skills", element: <CurriculumNestedPage kind="remedialSkills" /> },
          { path: "content-standards", element: <CurriculumNestedPage kind="contentStandards" /> },
          { path: "learning-standards", element: <CurriculumNestedPage kind="learningStandards" /> },
          { path: "objectives", element: <CurriculumNestedPage kind="objectives" /> },
        ],
      },
      {
        path: "question-bank",
        element: (
          <RequireRole roles={["SUPER_ADMIN", "ADMIN", "TEACHER"]}>
            <DashboardLayout />
          </RequireRole>
        ),
        children: [
          { index: true, element: <BuilderListPage entityKey="questionBank" /> },
          { path: "create", element: <RequireRole roles={["SUPER_ADMIN", "ADMIN"]}><BuilderFormPage entityKey="questionBank" mode="create" /></RequireRole> },
          { path: ":id", element: <BuilderDetailPage entityKey="questionBank" /> },
          { path: ":id/edit", element: <RequireRole roles={["SUPER_ADMIN", "ADMIN"]}><BuilderFormPage entityKey="questionBank" mode="edit" /></RequireRole> },
        ],
      },
      {
        path: "activity-templates",
        element: (
          <RequireRole roles={["SUPER_ADMIN", "ADMIN", "TEACHER"]}>
            <DashboardLayout />
          </RequireRole>
        ),
        children: [
          { index: true, element: <BuilderListPage entityKey="activityTemplates" /> },
          { path: ":id", element: <BuilderDetailPage entityKey="activityTemplates" /> },
        ],
      },
      {
        path: "digital-activities",
        element: (
          <RequireRole roles={["SUPER_ADMIN", "ADMIN", "TEACHER"]}>
            <DashboardLayout />
          </RequireRole>
        ),
        children: [
          { index: true, element: <BuilderListPage entityKey="digitalActivities" /> },
          { path: "create", element: <RequireRole roles={["SUPER_ADMIN", "ADMIN"]}><BuilderFormPage entityKey="digitalActivities" mode="create" /></RequireRole> },
          { path: ":id", element: <BuilderDetailPage entityKey="digitalActivities" /> },
          { path: ":id/edit", element: <RequireRole roles={["SUPER_ADMIN", "ADMIN"]}><BuilderFormPage entityKey="digitalActivities" mode="edit" /></RequireRole> },
          { path: ":id/preview", element: <DigitalActivityPreviewPage /> },
        ],
      },
      {
        path: "notifikasi",
        element: <RequireAuth><DashboardLayout /></RequireAuth>,
        children: [{ index: true, element: <NotificationCentrePage /> }, { path: "keutamaan", element: <NotificationPreferencesPage /> }],
      },
      {
        path: "guru/ai",
        element: <RequireTeacher><DashboardLayout /></RequireTeacher>,
        children: [
          { index: true, element: <AiOutputListPage /> }, { path: "draf", element: <AiOutputListPage /> }, { path: "draf/:draftId", element: <AiOutputDetailPage /> },
          { path: "draf-soalan", element: <AiDraftGeneratorPage path="/ai/question-bank/drafts" title="Jana Draf Soalan" /> },
          { path: "draf-aktiviti", element: <AiDraftGeneratorPage path="/ai/digital-activities/drafts" title="Jana Draf Aktiviti" /> },
        ],
      },
      {
        path: "ibu-bapa",
        element: (
          <RequireParent>
            <DashboardLayout />
          </RequireParent>
        ),
        children: [
          { index: true, element: <ParentDashboardPage /> },
          { path: "anak", element: <ParentChildrenPage /> },
          { path: "anak/:studentId", element: <ParentChildPage /> },
          { path: "tugasan", element: <ParentChildListPage kind="assignments" /> },
          { path: "penghantaran", element: <ParentChildListPage kind="submissions" /> },
          { path: "keputusan", element: <ParentChildListPage kind="assessments" /> },
          { path: "pbd", element: <ParentProgressPage /> },
          { path: "laporan", element: <ParentReportPage /> },
          { path: "notifikasi", element: <ParentSimpleListPage path="/notifications" key="notifications" title="Notifikasi" /> },
          { path: "pengumuman", element: <ParentSimpleListPage path="/announcements" key="announcements" title="Pengumuman" /> },
          { path: "profil", element: <ParentProfilePage /> },
        ],
      },
      {
        path: "murid",
        element: (
          <RequireStudent>
            <DashboardLayout />
          </RequireStudent>
        ),
        children: [
          { index: true, element: <StudentDashboardPage /> },
          { path: "tugasan", element: <StudentListPage resource="assignments" /> },
          { path: "tugasan/:assignmentId", element: <StudentAssignmentDetailPage /> },
          { path: "tugasan/:assignmentId/mainkan", element: <StudentPlayerPage /> },
          { path: "penghantaran", element: <StudentListPage resource="submissions" /> },
          { path: "penghantaran/:submissionId", element: <StudentDetailPage resource="submissions" /> },
          { path: "penilaian", element: <StudentListPage resource="assessments" /> },
          { path: "penilaian/:assessmentId", element: <StudentDetailPage resource="assessments" /> },
          { path: "kemajuan", element: <StudentProgressPage /> },
          { path: "notifikasi", element: <StudentListPage resource="notifications" /> },
          { path: "pengumuman", element: <StudentListPage resource="announcements" /> },
        ],
      },
      {
        path: "guru",
        element: (
          <RequireTeacher>
            <DashboardLayout />
          </RequireTeacher>
        ),
        children: [
          { index: true, element: <TeacherDashboardPage /> },
          { path: "kelas", element: <TeacherListPage resource="classes" /> },
          { path: "kelas/:classId", element: <TeacherDetailPage resource="classes" /> },
          { path: "kelas/:classId/murid/:studentId", element: <TeacherDetailPage resource="students" /> },
          { path: "murid", element: <TeacherListPage resource="students" /> },
          { path: "murid/:studentId", element: <TeacherDetailPage resource="students" /> },
          { path: "aktiviti", element: <TeacherListPage resource="activities" /> },
          { path: "aktiviti/:activityId", element: <TeacherDetailPage resource="activities" /> },
          { path: "aktiviti/:activityId/preview", element: <DigitalActivityPreviewPage /> },
          { path: "tugasan", element: <TeacherListPage resource="assignments" /> },
          { path: "tugasan/tambah", element: <TeacherAssignmentFormPage /> },
          { path: "tugasan/:assignmentId", element: <TeacherDetailPage resource="assignments" /> },
          { path: "tugasan/:assignmentId/edit", element: <TeacherDetailPage resource="assignments" /> },
          { path: "penghantaran", element: <TeacherListPage resource="submissions" /> },
          { path: "penghantaran/:submissionId", element: <TeacherDetailPage resource="submissions" /> },
          { path: "penilaian", element: <TeacherListPage resource="assessments" /> },
          { path: "penilaian/:assessmentId", element: <TeacherDetailPage resource="assessments" /> },
          { path: "pbd", element: <TeacherPbdPage /> },
          { path: "pbd/murid/:studentId", element: <TeacherListPage resource="evidence" /> },
          { path: "pbd/kelas/:classId", element: <TeacherPbdPage /> },
          { path: "laporan", element: <TeacherReportsPage /> },
          { path: "laporan/murid/:studentId", element: <TeacherReportsPage /> },
          { path: "laporan/kelas/:classId", element: <TeacherReportsPage /> },
          { path: "notifikasi", element: <TeacherListPage resource="notifications" /> },
          { path: "pengumuman", element: <TeacherListPage resource="announcements" /> },
          { path: "ai", element: <TeacherListPage resource="ai" /> },
          { path: "profil", element: <TeacherProfilePage /> },
        ],
      },
      {
        path: "admin",
        element: (
          <RequireAdmin>
            <DashboardLayout />
          </RequireAdmin>
        ),
        children: [
          { index: true, element: <AdminDashboardPage /> },
          { path: "sekolah", element: <AdminEntityListPage entityKey="schools" /> },
          { path: "sekolah/tambah", element: <AdminEntityFormPage entityKey="schools" mode="create" /> },
          { path: "sekolah/:id", element: <AdminEntityDetailPage entityKey="schools" /> },
          { path: "sekolah/:id/edit", element: <AdminEntityFormPage entityKey="schools" mode="edit" /> },
          { path: "pentadbir", element: <RequireRole roles={["SUPER_ADMIN"]}><AdminEntityListPage entityKey="admins" /></RequireRole> },
          { path: "pentadbir/tambah", element: <RequireRole roles={["SUPER_ADMIN"]}><AdminEntityFormPage entityKey="admins" mode="create" /></RequireRole> },
          { path: "pentadbir/:id", element: <RequireRole roles={["SUPER_ADMIN"]}><AdminEntityDetailPage entityKey="admins" /></RequireRole> },
          { path: "pentadbir/:id/edit", element: <RequireRole roles={["SUPER_ADMIN"]}><AdminEntityFormPage entityKey="admins" mode="edit" /></RequireRole> },
          { path: "guru", element: <AdminEntityListPage entityKey="teachers" /> },
          { path: "guru/tambah", element: <AdminEntityFormPage entityKey="teachers" mode="create" /> },
          { path: "guru/:id", element: <AdminEntityDetailPage entityKey="teachers" /> },
          { path: "guru/:id/edit", element: <AdminEntityFormPage entityKey="teachers" mode="edit" /> },
          { path: "murid", element: <AdminEntityListPage entityKey="students" /> },
          { path: "murid/tambah", element: <AdminEntityFormPage entityKey="students" mode="create" /> },
          { path: "murid/:id", element: <AdminEntityDetailPage entityKey="students" /> },
          { path: "murid/:id/edit", element: <AdminEntityFormPage entityKey="students" mode="edit" /> },
          { path: "ibu-bapa", element: <AdminEntityListPage entityKey="parents" /> },
          { path: "ibu-bapa/tambah", element: <AdminEntityFormPage entityKey="parents" mode="create" /> },
          { path: "ibu-bapa/:id", element: <AdminEntityDetailPage entityKey="parents" /> },
          { path: "ibu-bapa/:id/edit", element: <AdminEntityFormPage entityKey="parents" mode="edit" /> },
          { path: "kelas", element: <AdminEntityListPage entityKey="classes" /> },
          { path: "kelas/tambah", element: <AdminEntityFormPage entityKey="classes" mode="create" /> },
          { path: "kelas/:id", element: <AdminEntityDetailPage entityKey="classes" /> },
          { path: "kelas/:id/edit", element: <AdminEntityFormPage entityKey="classes" mode="edit" /> },
          { path: "tugasan", element: <AdminEntityListPage entityKey="assignments" /> },
          { path: "tugasan/:id", element: <AdminEntityDetailPage entityKey="assignments" /> },
          { path: "penghantaran", element: <AdminEntityListPage entityKey="submissions" /> },
          { path: "penghantaran/:id", element: <AdminEntityDetailPage entityKey="submissions" /> },
          { path: "penilaian", element: <AdminEntityListPage entityKey="assessments" /> },
          { path: "penilaian/:id", element: <AdminEntityDetailPage entityKey="assessments" /> },
          { path: "pbd", element: <AdminEntityListPage entityKey="pbdMastery" /> },
          { path: "pbd/bukti", element: <AdminEntityListPage entityKey="pbdEvidence" /> },
          { path: "pbd/murid/:id", element: <AdminEntityDetailPage entityKey="pbdMastery" /> },
          { path: "pbd/kelas/:id", element: <AdminEntityDetailPage entityKey="pbdMastery" /> },
          { path: "laporan", element: <AdminReportsPage /> },
          { path: "notifikasi", element: <AdminEntityListPage entityKey="notifications" /> },
          { path: "notifikasi/:id", element: <AdminEntityDetailPage entityKey="notifications" /> },
          { path: "pengumuman", element: <AdminEntityListPage entityKey="announcements" /> },
          { path: "pengumuman/tambah", element: <AdminEntityFormPage entityKey="announcements" mode="create" /> },
          { path: "pengumuman/:id", element: <AdminEntityDetailPage entityKey="announcements" /> },
          { path: "ai", element: <AdminEntityListPage entityKey="aiOutputs" /> },
          { path: "ai/:id", element: <AdminEntityDetailPage entityKey="aiOutputs" /> },
          { path: "audit", element: <AdminEntityListPage entityKey="auditLogs" /> },
          { path: "audit/:id", element: <AdminEntityDetailPage entityKey="auditLogs" /> },
          { path: "tetapan", element: <AdminSettingsPage /> },
          { path: "profil", element: <AdminProfilePage /> },
        ],
      },
      {
        path: "dashboard",
        element: (
          <RequireAuth>
            <DashboardLayout />
          </RequireAuth>
        ),
        children: [
          {
            index: true,
            element: <DashboardPage />,
          },
          {
            path: "super-admin",
            element: (
              <RequireRole roles={["SUPER_ADMIN"]}>
                <AdminLayout />
              </RequireRole>
            ),
            children: [{ index: true, element: <DashboardPage /> }],
          },
          {
            path: "admin",
            element: (
              <RequireAdmin>
                <AdminLayout />
              </RequireAdmin>
            ),
            children: [{ index: true, element: <DashboardPage /> }],
          },
          {
            path: "teacher",
            element: (
              <RequireTeacher>
                <TeacherLayout />
              </RequireTeacher>
            ),
            children: [{ index: true, element: <DashboardPage /> }],
          },
          {
            path: "student",
            element: (
              <RequireStudent>
                <StudentLayout />
              </RequireStudent>
            ),
            children: [{ index: true, element: <DashboardPage /> }],
          },
          {
            path: "parent",
            element: (
              <RequireParent>
                <ParentLayout />
              </RequireParent>
            ),
            children: [{ index: true, element: <DashboardPage /> }],
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
        path: "aktiviti/:activityId/mainkan",
        element: (
          <RequireAuth>
            <ActivityPlayerPage />
          </RequireAuth>
        ),
      },
      {
        path: "*",
        element: <NotFoundPage />,
      },
    ],
  },
])

export default router;
