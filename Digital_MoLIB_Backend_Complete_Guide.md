# Digital MoLIB Backend – Complete Folder, File and Frontend Integration Guide

This report is based on direct inspection of the uploaded backend source code.

## 1. Backend summary

- Approximately **220 backend source, Prisma, migration, and test files** were inspected.
- Prisma contains **57 database models** and **49 enums**.
- Architecture: **Express route → middleware → controller → validator → service → Prisma/PostgreSQL → standardized response**.
- Main domains: authentication, RBAC, schools, users, classes, curriculum, question bank, activity templates, digital activities, assignments, attempts, submissions, reviews, assessments, PBD mastery, reports, AI, notifications, audit, profiles, and media.

## 2. How the backend works

```text
Frontend React page
    ↓ Axios request with Bearer token
Express app.ts
    ↓ route module
Authentication / password-PIN / role / ownership middleware
    ↓ controller
Zod validator
    ↓ service
Business rules + authorization checks
    ↓ Prisma client
PostgreSQL database
    ↓
Standard JSON response returned to frontend
```

### Standard request example

```text
Student opens an assignment
GET /api/student/assignments/:assignmentId/delivery
    ↓
JWT is verified
    ↓
Role must be STUDENT
    ↓
Backend confirms the assignment belongs to that student
    ↓
Assignment, digital activity, items and media are loaded
    ↓
Frontend ActivityRenderer selects the correct player using rendererKey
```

## 3. Top-level folders

- **`src/controllers`** — HTTP request handlers. Controllers should stay thin and delegate business logic to services.
- **`src/services`** — Core application/business logic and database operations.
- **`src/routes`** — API endpoint definitions and middleware composition.
- **`src/validators`** — Zod request validation.
- **`src/middleware`** — Authentication, authorization, errors, rate limits and uploads.
- **`src/contracts`** — Shared payload contracts for student activity types.
- **`src/data`** — Static curriculum and activity-template seed data.
- **`src/prisma`** — Seed scripts.
- **`src/storage`** — Storage abstraction and local-file implementation.
- **`src/integrations`** — External AI integration, currently Google Gemini.
- **`src/utils`** — Hashing, JWT, IDs, setup tokens, phone normalization and safe JSON schema helpers.
- **`prisma`** — Prisma schema and database migrations.
- **`test`** — Node test suite covering modules, policies, contracts and migrations.

## 4. Important core files

- **`src/app.ts`** — Creates the Express application, applies security/global middleware, mounts all API route modules, handles 404 responses, and installs the central error handler.
- **`src/server.ts`** — Loads environment variables and starts the HTTP server, normally on port 3001.
- **`src/config/prisma.ts`** — Creates and exports the Prisma database client/adapter used by services.
- **`src/middleware/auth.middleware.ts`** — Reads Bearer JWT tokens, creates the authenticated session, and blocks users who must still change their first password or student PIN.
- **`src/middleware/role.middleware.ts`** — Implements RBAC, school-level access, teacher permission grants, student self-access, and parent linked-child access.
- **`src/middleware/error.middleware.ts`** — Converts application, validation, Prisma, and unexpected errors into consistent API responses.
- **`src/middleware/upload.middleware.ts`** — Configures Multer upload limits and accepted file handling.
- **`src/helpers/response.helper.ts`** — Standardizes successful API response format.
- **`src/errors/app-error.ts`** — Defines structured application errors with code, HTTP status, message, and details.
- **`src/storage/index.ts`** — Exports the selected storage service.
- **`src/storage/storage.service.ts`** — Provides common upload, download, and deletion operations independent of the storage provider.
- **`src/storage/local-storage.adapter.ts`** — Stores uploaded media on the local filesystem.
- **`src/storage/storage.config.ts`** — Reads and validates storage-related environment configuration.
- **`src/storage/storage.types.ts`** — Defines storage adapter and media metadata TypeScript contracts.
- **`src/integrations/gemini/gemini.client.ts`** — Creates the Google Gemini client and sends AI generation requests.
- **`src/integrations/gemini/gemini-models.ts`** — Defines the supported Gemini model names and model-selection rules.
- **`src/prisma/seed.ts`** — Main database seed entry point, including initial super-admin/setup records.
- **`src/prisma/curriculum.seed.ts`** — Seeds the Bahasa Melayu remedial curriculum hierarchy.
- **`src/prisma/activity-template.seed.ts`** — Seeds the registered activity templates and renderer definitions.
- **`src/data/curriculum/bm-pemulihan-2019.ts`** — Contains the structured Bahasa Melayu Pemulihan curriculum seed data.
- **`src/data/activity-templates/core-templates.ts`** — Contains the built-in activity-template registry such as MCQ, matching, reading, writing, and recording activities.

## 5. Database models

The schema contains these models:

`User`, `School`, `Teacher`, `SchoolClass`, `Student`, `Parent`, `ParentStudent`, `Admin`, `TeacherPermissionGrant`, `AuditLog`, `CurriculumVersion`, `Subject`, `CurriculumProgramme`, `CurriculumYear`, `LanguageStructure`, `RemedialSkill`, `ContentStandard`, `LearningStandard`, `RemedialSkillStandardMapping`, `LearningObjective`, `SuggestedTeachingActivity`, `QuestionBankItem`, `QuestionBankCurriculumLink`, `QuestionBankAnswerOption`, `QuestionBankMedia`, `ActivityTemplate`, `ActivityTemplateItemType`, `DigitalActivity`, `DigitalActivityCurriculumLink`, `DigitalActivityItem`, `DigitalActivityMedia`, `DigitalActivityReviewHistory`, `Assignment`, `AssignmentClassTarget`, `AssignmentStudentTarget`, `StudentAttempt`, `AssignmentSession`, `StudentAnswer`, `Submission`, `TeacherReview`, `SubmissionItemReview`, `Assessment`, `AssessmentItem`, `AssessmentAdjustment`, `PBDEvidence`, `StudentMastery`, `StudentMasteryHistory`, `AiPromptTemplate`, `AiRequest`, `AiGeneratedOutput`, `AiUsageDaily`, `Notification`, `NotificationRecipient`, `NotificationDelivery`, `NotificationPreference`, `Announcement`, `AnnouncementTarget`.

Important data-flow groups:

- Identity: `User`, `Admin`, `Teacher`, `Student`, `Parent`, `ParentStudent`, `TeacherPermissionGrant`.
- School structure: `School`, `SchoolClass`.
- Curriculum: `CurriculumVersion`, `Subject`, `CurriculumProgramme`, `CurriculumYear`, `LanguageStructure`, `RemedialSkill`, `ContentStandard`, `LearningStandard`, mappings, objectives and suggested activities.
- Content creation: `QuestionBankItem`, answer options, curriculum links, media, `ActivityTemplate`, `DigitalActivity`, items, media, links and review history.
- Delivery: `Assignment`, class/student targets, `StudentAttempt`, `AssignmentSession`, `StudentAnswer`.
- Review and assessment: `Submission`, `TeacherReview`, `SubmissionItemReview`, `Assessment`, items and adjustments.
- PBD: `PBDEvidence`, `StudentMastery`, `StudentMasteryHistory`.
- AI: prompt templates, requests, generated outputs and daily usage.
- Communication: notifications, recipients, deliveries, preferences, announcements and targets.
- Governance: `AuditLog`.

## 6. Module-by-module purpose

### Authentication
Normal role login, student school-ID/student-ID/PIN login, setup password, first-password change, first-PIN change and current-session retrieval.

### Administration
Creates and manages schools, admins, teachers, students, parents, classes, links and statuses with school-scoped permissions.

### Dashboard
Returns role-specific dashboard metrics for super admin, admin, teacher, student and parent.

### Curriculum
Manages the complete Bahasa Melayu remedial hierarchy and record lifecycle.

### Question bank
Creates reusable questions, options, curriculum links, media, activation/archive and duplicate checking.

### Activity templates
Registry of supported player types and their JSON schemas, scoring modes and statuses.

### Digital activities
Builds, reviews, publishes, previews and archives activities, including items, media and curriculum mappings.

### Assignments
Teachers assign published activities to classes or individual students; students and parents receive scoped views.

### Attempts
Starts, saves and submits a student's active activity session.

### Submissions and reviews
Stores submitted work, teacher item reviews, final decisions, feedback and revision flow.

### Assessment
Calculates scores, permits manual scoring and adjustments, and exposes results by role.

### PBD and mastery
Creates evidence, calculates mastery, supports teacher confirmation/override, history and class progress.

### Reports
Produces role-safe student, parent, teacher, class, school, skill and learning-standard reports.

### AI
Creates AI drafts and analysis with minimization, safety, review policy and mandatory human approval.

### Notifications
In-app notifications, preferences, read/archive/delete operations, announcements and delivery policy.

### Media
Uploads, retrieves and deletes activity/profile media using the storage abstraction.

### Audit
Persists and retrieves important administrative/security actions.

### Profile
Reads and updates the current user profile, avatar, password or student PIN.


## 7. API route groups

Mounted base paths from `src/app.ts` include:

```text
/api/auth
/api/admins
/api/schools
/api/teachers
/api/parents
/api/students
/api/classes
/api/parent-students
/api/dashboard
/api/media
/api/audit-logs
/api/profile
/api/curriculum
/api/question-bank
/api/activity-templates
/api/digital-activities
/api/assignments
/api/student
/api/student/attempts
/api/submissions
/api/student/submissions
/api/parent
/api/assessments
/api/student/assessments
/api/pbd
/api/reports
/api/ai
/api/notifications
/api/preferences
/api/announcements
```

### `src/routes/activity-template.routes.ts`
- Line 21: `router.get("/", read, listActivityTemplatesController);`
- Line 22: `router.get("/:templateId", read, getActivityTemplateController);`
- Line 23: `router.post("/", registryManagement, createActivityTemplateController);`
- Line 24: `router.patch("/:templateId", registryManagement, updateActivityTemplateController);`
- Line 25: `router.post("/:templateId/archive", registryManagement, archiveActivityTemplateController);`
- Line 26: `router.patch("/:templateId/status", registryManagement, updateActivityTemplateStatusController);`

### `src/routes/admin.routes.ts`
- Line 27: `router.post("/", createAdminController);`
- Line 28: `router.get("/", listAdminsController);`
- Line 29: `router.get("/:adminId", getAdminByIdController);`
- Line 30: `router.patch("/:adminId", updateAdminController);`
- Line 31: `router.patch("/:adminId/status", updateAdminStatusController);`
- Line 32: `router.post("/:adminId/resend-setup", resendSetupRateLimiter, resendAdminSetupController);`

### `src/routes/ai.routes.ts`
- Line 8: `router.post("/question-bank/drafts", controller.draftController(AiFeatureType.QUESTION_DRAFT));`
- Line 9: `router.post("/digital-activities/drafts", controller.draftController(AiFeatureType.ACTIVITY_DRAFT));`
- Line 10: `router.post("/reading-passages/drafts", controller.draftController(AiFeatureType.READING_PASSAGE_DRAFT));`
- Line 11: `router.post("/reading-comprehension/drafts", controller.draftController(AiFeatureType.READING_COMPREHENSION_DRAFT));`
- Line 12: `router.post("/text/simplify", controller.draftController(AiFeatureType.TEXT_SIMPLIFICATION));`
- Line 13: `router.post("/curriculum/alignment-check", controller.draftController(AiFeatureType.CURRICULUM_ALIGNMENT));`
- Line 14: `router.post("/students/:studentId/practice-suggestions", controller.draftController(AiFeatureType.PRACTICE_SUGGESTION));`
- Line 15: `router.post("/submissions/:submissionId/feedback-draft", requireRole(UserRole.TEACHER), controller.draftController(AiFeatureType.FEEDBACK_DRAFT));`
- Line 16: `router.post("/parent-progress/:studentId/summary-draft", controller.draftController(AiFeatureType.PARENT_SUMMARY_DRAFT));`
- Line 17: `router.post("/audio/transcribe", controller.draftController(AiFeatureType.AUDIO_TRANSCRIPTION));`
- Line 18: `router.post("/audio/reading-analysis", controller.draftController(AiFeatureType.AUDIO_READING_ANALYSIS));`
- Line 19: `router.get("/outputs", controller.listOutputsController); router.get("/outputs/:outputId", controller.getOutputController); router.post("/outputs/:outputId/approve", controller.approveOutputController); router.post("/outputs/:outputId/reject", controller.rejectOutputController); router.post("/outputs/:outputId/archive", controller.archiveOutputController);`

### `src/routes/assessment.routes.ts`
- Line 9: `router.get("/", controller.listAssessmentsController);`
- Line 10: `router.get("/:assessmentId", controller.getAssessmentController);`
- Line 11: `router.post("/:assessmentId/recalculate", controller.recalculateAssessmentController);`
- Line 12: `router.post("/:assessmentId/items/:activityItemId/manual-score", controller.scoreManualItemController);`
- Line 13: `router.post("/:assessmentId/adjustments", controller.createAdjustmentController);`
- Line 14: `router.post("/:assessmentId/invalidate", controller.invalidateAssessmentController);`
- Line 15: `router.post("/:assessmentId/archive", controller.archiveAssessmentController);`

### `src/routes/assignment.routes.ts`
- Line 10: `router.get("/", requirePasswordChanged, manage, controller.listAssignmentsController);`
- Line 11: `router.post("/", requirePasswordChanged, manage, controller.createAssignmentController);`
- Line 12: `router.get("/:assignmentId", requirePasswordChanged, manage, controller.getAssignmentController);`
- Line 13: `router.patch("/:assignmentId", requirePasswordChanged, manage, controller.updateAssignmentController);`

### `src/routes/audit.routes.ts`
- Line 11: `router.get("/", listAuditLogsController);`
- Line 12: `router.get("/:auditLogId", getAuditLogByIdController);`

### `src/routes/auth.routes.ts`
- Line 45: `router.post("/login", loginRateLimiter, loginController);`
- Line 46: `router.post("/student/login", studentLoginRateLimiter, studentLoginController);`
- Line 47: `router.post("/setup-password", setupPasswordController);`
- Line 48: `router.post(`
- Line 54: `router.post(`
- Line 61: `router.get("/me", authenticate, meController);`

### `src/routes/curriculum.routes.ts`
- Line 71: `router.post(`
- Line 76: `router.get(`
- Line 81: `router.get(`
- Line 86: `router.patch(`
- Line 91: `router.post(`
- Line 96: `router.post(`
- Line 102: `router.post("/subjects", requireCurriculumManagement, createSubjectController);`
- Line 103: `router.get("/subjects", requireCurriculumRead, listSubjectsController);`
- Line 104: `router.get("/subjects/:subjectId", requireCurriculumRead, getSubjectController);`
- Line 105: `router.patch(`
- Line 111: `router.post("/programmes", requireCurriculumManagement, createProgrammeController);`
- Line 112: `router.get("/programmes", requireCurriculumRead, listProgrammesController);`
- Line 113: `router.get(`
- Line 118: `router.post(`
- Line 123: `router.get(`
- Line 128: `router.post(`
- Line 133: `router.get(`
- Line 138: `router.post(`
- Line 143: `router.get(`
- Line 148: `router.post(`
- Line 153: `router.get(`
- Line 158: `router.get(`
- Line 163: `router.patch(`
- Line 169: `router.patch(`
- Line 174: `router.patch(`
- Line 180: `router.get(`
- Line 185: `router.post(`
- Line 190: `router.delete(`
- Line 195: `router.post(`
- Line 200: `router.get(`
- Line 205: `router.post(`
- Line 210: `router.get(`
- Line 215: `router.get(`
- Line 220: `router.patch(`
- Line 226: `router.post(`
- Line 231: `router.get(`
- Line 236: `router.get(`
- Line 241: `router.patch(`
- Line 247: `router.get(`
- Line 252: `router.patch(`
- Line 258: `router.get(`
- Line 263: `router.patch(`
- Line 269: `router.get(`
- Line 274: `router.patch(`

### `src/routes/dashboard.routes.ts`
- Line 9: `router.get("/super-admin", authenticate, requirePasswordChanged, requireRole(UserRole.SUPER_ADMIN), superAdminDashboardController);`
- Line 10: `router.get("/admin", authenticate, requirePasswordChanged, requireRole(UserRole.ADMIN), adminDashboardController);`
- Line 11: `router.get("/teacher", authenticate, requirePasswordChanged, requireRole(UserRole.TEACHER), teacherDashboardController);`
- Line 12: `router.get("/student", authenticate, requireStudentPinChanged, requireRole(UserRole.STUDENT), studentDashboardController);`
- Line 13: `router.get("/parent", authenticate, requirePasswordChanged, requireRole(UserRole.PARENT), parentDashboardController);`

### `src/routes/digitalActivity.routes.ts`
- Line 12: `router.post("/", manage, controller.createDigitalActivityController);`
- Line 13: `router.get("/", read, controller.listDigitalActivitiesController);`
- Line 14: `router.get("/:activityId", read, controller.getDigitalActivityController);`
- Line 15: `router.patch("/:activityId", manage, controller.updateDigitalActivityController);`
- Line 16: `router.post("/:activityId/submit-review", manage, controller.submitReviewController);`
- Line 17: `router.post("/:activityId/return-draft", superAdmin, controller.returnDraftController);`
- Line 18: `router.post("/:activityId/publish", superAdmin, controller.publishController);`
- Line 19: `router.post("/:activityId/archive", superAdmin, controller.archiveController);`
- Line 20: `router.get("/:activityId/preview", read, controller.previewController);`
- Line 21: `router.get("/:activityId/review-history", read, controller.historyController);`
- Line 22: `router.post("/:activityId/curriculum-links", manage, controller.addCurriculumLinkController);`
- Line 23: `router.get("/:activityId/curriculum-links", read, controller.listCurriculumLinksController);`
- Line 24: `router.delete("/:activityId/curriculum-links/:linkId", manage, controller.removeCurriculumLinkController);`
- Line 25: `router.post("/:activityId/items", manage, controller.addItemController);`
- Line 26: `router.get("/:activityId/items", read, controller.listItemsController);`
- Line 27: `router.patch("/:activityId/items/reorder", manage, controller.reorderItemsController);`
- Line 28: `router.patch("/:activityId/items/:activityItemId", manage, controller.updateItemController);`
- Line 29: `router.delete("/:activityId/items/:activityItemId", manage, controller.removeItemController);`
- Line 30: `router.post("/:activityId/media", manage, controller.addMediaController);`
- Line 31: `router.get("/:activityId/media", read, controller.listMediaController);`
- Line 32: `router.patch("/:activityId/media/reorder", manage, controller.reorderMediaController);`
- Line 33: `router.delete("/:activityId/media/:mediaLinkId", manage, controller.removeMediaController);`

### `src/routes/media.routes.ts`
- Line 20: `router.post("/upload", uploadRateLimiter, singleMediaUpload, uploadMediaController);`
- Line 21: `router.get("/files/*key", getMediaFileController);`
- Line 22: `router.delete("/files", deleteRateLimiter, deleteMediaController);`

### `src/routes/notification.routes.ts`
- Line 6: `router.get("/notifications", controller.listNotificationsController);`
- Line 7: `router.get("/notifications/unread", controller.unreadNotificationsController);`
- Line 8: `router.get("/notifications/:id", controller.getNotificationController);`
- Line 9: `router.post("/notifications/read", controller.markReadController);`
- Line 10: `router.post("/notifications/read-all", controller.readAllController);`
- Line 11: `router.post("/notifications/archive", controller.archiveController);`
- Line 12: `router.delete("/notifications/:id", controller.deleteController);`
- Line 13: `router.get("/preferences", controller.preferencesController);`
- Line 14: `router.patch("/preferences", controller.updatePreferencesController);`
- Line 15: `router.get("/announcements", controller.listAnnouncementsController);`
- Line 16: `router.post("/announcements", controller.createAnnouncementController);`
- Line 17: `router.post("/announcements/:id/publish", controller.publishAnnouncementController);`

### `src/routes/parent-assessment.routes.ts`
- Line 9: `router.get("/children/:studentId/assessments", listParentAssessmentsController);`

### `src/routes/parent-assignment.routes.ts`
- Line 9: `router.get("/children/:studentId/assignments", getParentChildrenAssignmentsController);`

### `src/routes/parent-progress.routes.ts`
- Line 6: `const router = Router(); router.use(authenticate, requirePasswordChanged, requireRole(UserRole.PARENT)); router.get("/children/:studentId/progress", parentProgressController); router.get("/children/:studentId/progress/skills/:remedialSkillId", parentSkillProgressController); export default router;`

### `src/routes/parent-submission.routes.ts`
- Line 9: `router.get("/children/:studentId/submissions", listParentSubmissionsController);`

### `src/routes/parent.routes.ts`
- Line 18: `router.get("/", requireRole(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.TEACHER), listParentsController);`
- Line 19: `router.get("/:parentId", requireRole(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.TEACHER), getParentByIdController);`
- Line 20: `router.get("/:parentId/students", requireRole(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.TEACHER), getParentStudentsController);`
- Line 22: `router.post("/", requireRole(UserRole.SUPER_ADMIN, UserRole.ADMIN), createParentController);`
- Line 23: `router.patch("/:parentId", requireRole(UserRole.SUPER_ADMIN, UserRole.ADMIN), updateParentController);`
- Line 24: `router.patch("/:parentId/status", requireRole(UserRole.SUPER_ADMIN, UserRole.ADMIN), updateParentStatusController);`
- Line 25: `router.post("/:parentId/resend-setup", requireRole(UserRole.SUPER_ADMIN, UserRole.ADMIN), resendSetupRateLimiter, resendParentSetupController);`
- Line 26: `router.post("/:parentId/students/:studentId", requireRole(UserRole.SUPER_ADMIN, UserRole.ADMIN), linkParentStudentController);`
- Line 27: `router.delete("/:parentId/students/:studentId", requireRole(UserRole.SUPER_ADMIN, UserRole.ADMIN), unlinkParentStudentController);`

### `src/routes/parentStudent.routes.ts`
- Line 17: `router.post("/", createParentStudentController);`
- Line 19: `router.put("/:id", updateParentStudentController);`
- Line 21: `router.delete("/:id", deleteParentStudentController);`

### `src/routes/pbd.routes.ts`
- Line 8: `router.get("/evidence", requireRole(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.TEACHER), controller.listEvidenceController);`
- Line 9: `router.get("/evidence/:evidenceId", requireRole(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.TEACHER), controller.getEvidenceController);`
- Line 10: `router.post("/evidence/observations", requireRole(UserRole.TEACHER), controller.observationController);`
- Line 11: `router.post("/evidence/:evidenceId/invalidate", requireRole(UserRole.SUPER_ADMIN, UserRole.ADMIN), controller.invalidateEvidenceController);`
- Line 12: `router.get("/mastery", requireRole(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.TEACHER), controller.listMasteryController);`
- Line 13: `router.get("/mastery/:masteryId", requireRole(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.TEACHER), controller.getMasteryController);`
- Line 14: `router.post("/mastery/:masteryId/recalculate", requireRole(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.TEACHER), controller.recalculateMasteryController);`
- Line 15: `router.post("/mastery/:masteryId/confirm", requireRole(UserRole.SUPER_ADMIN, UserRole.TEACHER), controller.confirmMasteryController);`
- Line 16: `router.post("/mastery/:masteryId/override", requireRole(UserRole.SUPER_ADMIN, UserRole.TEACHER), controller.overrideMasteryController);`
- Line 17: `router.post("/mastery/:masteryId/archive", requireRole(UserRole.SUPER_ADMIN), controller.archiveMasteryController);`
- Line 18: `router.get("/classes/:classId/progress", requireRole(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.TEACHER), controller.classProgressController);`

### `src/routes/profile.routes.ts`
- Line 16: `router.get("/me", getMyProfileController);`
- Line 17: `router.get("/account", getMyAccountController);`
- Line 18: `router.patch("/me", requirePasswordChanged, requireStudentPinChanged, updateMyProfileController);`
- Line 19: `router.patch("/me/avatar", requirePasswordChanged, requireStudentPinChanged, avatarRateLimiter, updateMyAvatarController);`
- Line 20: `router.post("/change-password", requirePasswordChanged, requireRole(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.TEACHER, UserRole.PARENT), passwordRateLimiter, changeMyPasswordController);`
- Line 21: `router.post("/change-pin", requireStudentPinChanged, requireRole(UserRole.STUDENT), pinRateLimiter, changeMyPinController);`

### `src/routes/question-bank.routes.ts`
- Line 34: `router.post("/items", manage, createQuestionBankItemController);`
- Line 35: `router.get("/items", read, listQuestionBankItemsController);`
- Line 36: `router.get("/items/:itemId", read, getQuestionBankItemController);`
- Line 37: `router.patch("/items/:itemId", manage, updateQuestionBankItemController);`
- Line 38: `router.post("/items/:itemId/activate", manage, activateQuestionBankItemController);`
- Line 39: `router.post("/items/:itemId/archive", manage, archiveQuestionBankItemController);`
- Line 41: `router.post("/items/:itemId/curriculum-links", manage, addQuestionBankCurriculumLinkController);`
- Line 42: `router.get("/items/:itemId/curriculum-links", read, listQuestionBankCurriculumLinksController);`
- Line 43: `router.delete("/items/:itemId/curriculum-links/:linkId", manage, removeQuestionBankCurriculumLinkController);`
- Line 45: `router.post("/items/:itemId/options", manage, addQuestionBankAnswerOptionController);`
- Line 46: `router.get("/items/:itemId/options", read, listQuestionBankAnswerOptionsController);`
- Line 47: `router.patch("/items/:itemId/options/reorder", manage, reorderQuestionBankOptionsController);`
- Line 48: `router.patch("/items/:itemId/options/:optionId", manage, updateQuestionBankAnswerOptionController);`
- Line 49: `router.delete("/items/:itemId/options/:optionId", manage, removeQuestionBankAnswerOptionController);`
- Line 51: `router.post("/items/:itemId/media", manage, addQuestionBankMediaController);`
- Line 52: `router.get("/items/:itemId/media", read, listQuestionBankMediaController);`
- Line 53: `router.delete("/items/:itemId/media/:mediaLinkId", manage, removeQuestionBankMediaController);`
- Line 54: `router.patch("/items/:itemId/media/reorder", manage, reorderQuestionBankMediaController);`
- Line 56: `router.post("/duplicate-check", manage, duplicateCheckController);`

### `src/routes/report.routes.ts`
- Line 7: `router.get("/student/:studentId", authenticate, requirePasswordChanged, requireStudentPinChanged, requireRole(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.TEACHER, UserRole.STUDENT), controller.studentReportController);`
- Line 8: `router.get("/parent/:studentId", authenticate, requirePasswordChanged, requireRole(UserRole.PARENT), controller.parentReportController);`
- Line 9: `router.get("/teacher/:teacherId", authenticate, requirePasswordChanged, requireRole(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.TEACHER), controller.teacherReportController);`
- Line 10: `router.get("/class/:classId", authenticate, requirePasswordChanged, requireRole(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.TEACHER), controller.classReportController);`
- Line 11: `router.get("/school/:schoolId", authenticate, requirePasswordChanged, requireRole(UserRole.SUPER_ADMIN, UserRole.ADMIN), controller.schoolReportController);`
- Line 12: `router.get("/remedial-skills", authenticate, requirePasswordChanged, requireRole(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.TEACHER), controller.remedialSkillReportController);`
- Line 13: `router.get("/learning-standards", authenticate, requirePasswordChanged, requireRole(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.TEACHER), controller.learningStandardReportController);`

### `src/routes/school.routes.ts`
- Line 22: `router.post("/", createSchoolController);`
- Line 23: `router.get("/", listSchoolsController);`
- Line 24: `router.get("/:schoolId", getSchoolByIdController);`
- Line 25: `router.patch("/:schoolId", updateSchoolController);`
- Line 26: `router.patch("/:schoolId/status", updateSchoolStatusController);`

### `src/routes/schoolClass.routes.ts`
- Line 18: `router.post("/", requireRole(...managementRoles), createSchoolClassController);`
- Line 19: `router.get("/", requireRole(...readRoles), getSchoolClassesController);`
- Line 21: `router.get("/:classId/students", requireRole(...readRoles), getSchoolClassStudentsController);`
- Line 22: `router.post("/:classId/students/:studentId", requireRole(...managementRoles), assignStudentToSchoolClassController);`
- Line 23: `router.delete("/:classId/students/:studentId", requireRole(...managementRoles), removeStudentFromSchoolClassController);`
- Line 24: `router.patch("/:classId/status", requireRole(...managementRoles), updateSchoolClassStatusController);`
- Line 25: `router.patch("/:classId/teacher", requireRole(...managementRoles), assignSchoolClassTeacherController);`
- Line 26: `router.get("/:classId", requireRole(...readRoles), getSchoolClassByIdController);`
- Line 27: `router.patch("/:classId", requireRole(...managementRoles), updateSchoolClassController);`

### `src/routes/student-assessment.routes.ts`
- Line 9: `router.get("/", listStudentAssessmentsController);`
- Line 10: `router.get("/:assessmentId", getStudentAssessmentController);`

### `src/routes/student-assignment.routes.ts`
- Line 9: `router.get("/assignments", requireRole(UserRole.STUDENT), listStudentAssignmentsController);`
- Line 10: `router.get("/assignments/:assignmentId", requireRole(UserRole.STUDENT), getStudentAssignmentController);`
- Line 11: `router.get("/assignments/:assignmentId/delivery", requireRole(UserRole.STUDENT), getStudentAssignmentDeliveryController);`

### `src/routes/student-attempt.routes.ts`
- Line 9: `router.post("/:attemptId/save", saveAttemptController);`
- Line 10: `router.post("/:attemptId/submit", submitAttemptController);`

### `src/routes/student-progress.routes.ts`
- Line 6: `const router = Router(); router.use(authenticate, requirePasswordChanged, requireRole(UserRole.STUDENT)); router.get("/progress", studentProgressController); router.get("/progress/skills/:remedialSkillId", studentSkillProgressController); export default router;`

### `src/routes/student-submission.routes.ts`
- Line 9: `router.get("/", listStudentSubmissionsController);`
- Line 10: `router.get("/:submissionId", getStudentSubmissionController);`
- Line 11: `router.get("/:submissionId/feedback", getStudentFeedbackController);`
- Line 12: `router.post("/:submissionId/revise", reviseSubmissionController);`

### `src/routes/student.routes.ts`
- Line 30: `router.post("/", requireRole(...managementRoles), createStudentController);`
- Line 31: `router.get("/", requireRole(...readRoles), getStudentsController);`
- Line 33: `router.get("/:studentProfileId/parents", requireRole(...readRoles), teacherStudentAccess, getStudentParentsController);`
- Line 34: `router.post("/:studentProfileId/parents/:parentId", requireRole(...managementRoles), linkStudentParentController);`
- Line 35: `router.delete("/:studentProfileId/parents/:parentId", requireRole(...managementRoles), unlinkStudentParentController);`
- Line 36: `router.post("/:studentProfileId/reset-pin", requireRole(...readRoles), teacherStudentAccess, resetPinRateLimiter, resetStudentPinController);`
- Line 37: `router.patch("/:studentProfileId/class", requireRole(...managementRoles), transferStudentClassController);`
- Line 38: `router.patch("/:studentProfileId/status", requireRole(...managementRoles), updateStudentStatusController);`
- Line 39: `router.get("/:studentProfileId", requireRole(...readRoles), teacherStudentAccess, getStudentByIdController);`
- Line 40: `router.patch("/:studentProfileId", requireRole(...readRoles), teacherStudentAccess, updateStudentController);`

### `src/routes/submission.routes.ts`
- Line 9: `router.get("/", controller.listSubmissionsController);`
- Line 10: `router.get("/:submissionId", controller.getSubmissionController);`
- Line 11: `router.post("/:submissionId/start-review", controller.startReviewController);`
- Line 12: `router.patch("/:submissionId/items/:activityItemId/review", controller.updateItemReviewController);`
- Line 13: `router.post("/:submissionId/complete-review", controller.completeReviewController);`
- Line 14: `router.post("/:submissionId/cancel", controller.cancelSubmissionController);`
- Line 15: `router.post("/:submissionId/archive", controller.archiveSubmissionController);`

### `src/routes/teacher.routes.ts`
- Line 28: `router.post(`
- Line 45: `router.get("/", listTeachersController);`
- Line 46: `router.get("/:teacherId", getTeacherByIdController);`
- Line 47: `router.patch("/:teacherId", updateTeacherController);`
- Line 48: `router.patch("/:teacherId/status", updateTeacherStatusController);`
- Line 49: `router.post("/:teacherId/resend-setup", resendSetupRateLimiter, resendTeacherSetupController);`
- Line 50: `router.post("/:teacherId/grants", createTeacherGrantController);`
- Line 51: `router.get("/:teacherId/grants", listTeacherGrantsController);`
- Line 52: `router.delete("/:teacherId/grants/:grantId", revokeTeacherGrantController);`

## 8. Security and RBAC

- JWT Bearer tokens are checked by `authenticate`.
- Non-student first-time users are blocked by `requirePasswordChanged` until they change the temporary password.
- Students are blocked by `requireStudentPinChanged` until they replace the temporary PIN.
- `requireRole` enforces role access.
- School-scoped middleware prevents an admin or teacher from reading another school's records.
- Teacher permission grants allow limited delegated capabilities with expiry and usage limits.
- Student self-access prevents students opening another student's data.
- Parent linked-child access checks the `ParentStudent` relationship.
- Rate limiting exists globally and on sensitive authentication, setup, upload and reset operations.
- Passwords and PINs are hashed with bcrypt; JWTs are signed by backend utilities.
- Helmet is enabled. CORS is enabled, but production should restrict allowed origins rather than accepting all origins.

## 9. Frontend-to-backend compatibility

### Clearly aligned

- Frontend authentication endpoints match backend: `/auth/login`, `/auth/student/login`, `/auth/me`, `/auth/change-first-password`, `/auth/student/change-first-pin`.
- Role dashboards match: `/dashboard/super-admin`, `/dashboard/admin`, `/dashboard/teacher`, `/dashboard/student`, `/dashboard/parent`.
- Admin entities match: `/admins`, `/schools`, `/teachers`, `/students`, `/parents`, `/classes`, `/audit-logs`.
- Builder modules match: `/curriculum`, `/question-bank/items`, `/activity-templates`, `/digital-activities`.
- Teacher workflow matches: `/assignments`, `/submissions`, `/assessments`, `/pbd/evidence`, `/pbd/mastery`, `/reports/...`.
- Student workflow matches: `/student/assignments`, assignment delivery, `/student/submissions`, `/student/assessments`, and `/student/progress`.
- Parent workflow matches: `/parent/children/:studentId/assignments`, submissions, assessments, progress and reports.
- AI endpoints used by the frontend match the backend draft/output routes.
- Notification endpoints match `/notifications`, read/read-all/archive and `/preferences`.

### Important integration checks

- Confirm the frontend Axios base URL ends with `/api` exactly once. For local development it should normally be `http://localhost:3001/api`.
- Backend success responses are wrapped by `successResponse`; frontend API functions must read the correct nested `data` property.
- The backend globally limits each IP to 100 requests per 15 minutes. Repeated login clicks can produce HTTP 429, as seen previously.
- `cors()` currently permits all origins. Set an environment-driven whitelist before production.
- Media currently has a local storage adapter. Railway or other ephemeral hosting can delete local files after redeploy; production should use Cloudinary, S3 or another persistent provider.
- Notification email service exists, but real email delivery depends on valid provider configuration.
- Gemini integration depends on the Google AI environment key and still requires human-review workflow.
- Frontend route guards improve UX, but backend middleware remains the real security boundary.
- Some route files use broad module middleware while others add operation-specific guards. Continue testing every endpoint against all five roles.

## 10. Complete file list and purpose

- **`prisma/migrations/20260705112227_init/migration.sql`** — Database migration SQL that introduces or changes the related schema feature.
- **`prisma/migrations/20260705150558_remove_must_change_password/migration.sql`** — Database migration SQL that introduces or changes the related schema feature.
- **`prisma/migrations/20260707165256_add_student_pin_fields/migration.sql`** — Database migration SQL that introduces or changes the related schema feature.
- **`prisma/migrations/20260725120000_auth_foundation/migration.sql`** — Database migration SQL that introduces or changes the related schema feature.
- **`prisma/migrations/20260726145937_persistent_audit_log/migration.sql`** — Database migration SQL that introduces or changes the related schema feature.
- **`prisma/migrations/20260726175354_curriculum_foundation/migration.sql`** — Database migration SQL that introduces or changes the related schema feature.
- **`prisma/migrations/20260726191158_question_bank_template_registry/migration.sql`** — Database migration SQL that introduces or changes the related schema feature.
- **`prisma/migrations/20260726200015_digital_activity_builder/migration.sql`** — Database migration SQL that introduces or changes the related schema feature.
- **`prisma/migrations/20260727190000_student_assignment_delivery/migration.sql`** — Database migration SQL that introduces or changes the related schema feature.
- **`prisma/migrations/20260727200000_student_attempt_session_engine/migration.sql`** — Database migration SQL that introduces or changes the related schema feature.
- **`prisma/migrations/20260728120000_submission_teacher_review/migration.sql`** — Database migration SQL that introduces or changes the related schema feature.
- **`prisma/migrations/20260728130000_assessment_engine/migration.sql`** — Database migration SQL that introduces or changes the related schema feature.
- **`prisma/migrations/20260728150000_pbd_progress_mastery/migration.sql`** — Database migration SQL that introduces or changes the related schema feature.
- **`prisma/migrations/20260728160000_ai_smart_learning_features/migration.sql`** — Database migration SQL that introduces or changes the related schema feature.
- **`prisma/migrations/20260728170000_notification_communication_engine/migration.sql`** — Database migration SQL that introduces or changes the related schema feature.
- **`prisma/migrations/migration_lock.toml`** — Database migration SQL that introduces or changes the related schema feature.
- **`prisma/schema.prisma`** — The complete PostgreSQL data model, relations, indexes, and enums used by Prisma.
- **`src/app.ts`** — Creates the Express application, applies security/global middleware, mounts all API route modules, handles 404 responses, and installs the central error handler.
- **`src/config/prisma.ts`** — Creates and exports the Prisma database client/adapter used by services.
- **`src/contracts/arrange-letters.contract.ts`** — Defines the canonical data contract for the arrange letters activity so frontend and backend use the same shape.
- **`src/contracts/arrange-syllables.contract.ts`** — Defines the canonical data contract for the arrange syllables activity so frontend and backend use the same shape.
- **`src/contracts/copy-writing.contract.ts`** — Defines the canonical data contract for the copy writing activity so frontend and backend use the same shape.
- **`src/contracts/fill-blank.contract.ts`** — Defines the canonical data contract for the fill blank activity so frontend and backend use the same shape.
- **`src/contracts/free-handwriting.contract.ts`** — Defines the canonical data contract for the free handwriting activity so frontend and backend use the same shape.
- **`src/contracts/reading-comprehension.contract.ts`** — Defines the canonical data contract for the reading comprehension activity so frontend and backend use the same shape.
- **`src/contracts/reading.contract.ts`** — Defines the canonical data contract for the reading activity so frontend and backend use the same shape.
- **`src/contracts/tracing.contract.ts`** — Defines the canonical data contract for the tracing activity so frontend and backend use the same shape.
- **`src/contracts/voice-recording.contract.ts`** — Defines the canonical data contract for the voice recording activity so frontend and backend use the same shape.
- **`src/contracts/word-builder.contract.ts`** — Defines the canonical data contract for the word builder activity so frontend and backend use the same shape.
- **`src/controllers/activity-template.controller.ts`** — Receives HTTP requests for the activity template module, validates input, calls the service layer, and returns standardized responses.
- **`src/controllers/admin.controller.ts`** — Receives HTTP requests for the admin module, validates input, calls the service layer, and returns standardized responses.
- **`src/controllers/ai.controller.ts`** — Receives HTTP requests for the ai module, validates input, calls the service layer, and returns standardized responses.
- **`src/controllers/assessment.controller.ts`** — Receives HTTP requests for the assessment module, validates input, calls the service layer, and returns standardized responses.
- **`src/controllers/assignment.controller.ts`** — Receives HTTP requests for the assignment module, validates input, calls the service layer, and returns standardized responses.
- **`src/controllers/attempt.controller.ts`** — Receives HTTP requests for the attempt module, validates input, calls the service layer, and returns standardized responses.
- **`src/controllers/audit.controller.ts`** — Receives HTTP requests for the audit module, validates input, calls the service layer, and returns standardized responses.
- **`src/controllers/auth.controller.ts`** — Receives HTTP requests for the auth module, validates input, calls the service layer, and returns standardized responses.
- **`src/controllers/curriculum.controller.ts`** — Receives HTTP requests for the curriculum module, validates input, calls the service layer, and returns standardized responses.
- **`src/controllers/dashboard.controller.ts`** — Receives HTTP requests for the dashboard module, validates input, calls the service layer, and returns standardized responses.
- **`src/controllers/digitalActivity.controller.ts`** — Receives HTTP requests for the digitalActivity module, validates input, calls the service layer, and returns standardized responses.
- **`src/controllers/media.controller.ts`** — Receives HTTP requests for the media module, validates input, calls the service layer, and returns standardized responses.
- **`src/controllers/notification.controller.ts`** — Receives HTTP requests for the notification module, validates input, calls the service layer, and returns standardized responses.
- **`src/controllers/parent.controller.ts`** — Receives HTTP requests for the parent module, validates input, calls the service layer, and returns standardized responses.
- **`src/controllers/parentStudent.controller.ts`** — Receives HTTP requests for the parentStudent module, validates input, calls the service layer, and returns standardized responses.
- **`src/controllers/pbd.controller.ts`** — Receives HTTP requests for the pbd module, validates input, calls the service layer, and returns standardized responses.
- **`src/controllers/profile.controller.ts`** — Receives HTTP requests for the profile module, validates input, calls the service layer, and returns standardized responses.
- **`src/controllers/question-bank.controller.ts`** — Receives HTTP requests for the question bank module, validates input, calls the service layer, and returns standardized responses.
- **`src/controllers/report.controller.ts`** — Receives HTTP requests for the report module, validates input, calls the service layer, and returns standardized responses.
- **`src/controllers/school.controller.ts`** — Receives HTTP requests for the school module, validates input, calls the service layer, and returns standardized responses.
- **`src/controllers/schoolClass.controller.ts`** — Receives HTTP requests for the schoolClass module, validates input, calls the service layer, and returns standardized responses.
- **`src/controllers/student.controller.ts`** — Receives HTTP requests for the student module, validates input, calls the service layer, and returns standardized responses.
- **`src/controllers/submission.controller.ts`** — Receives HTTP requests for the submission module, validates input, calls the service layer, and returns standardized responses.
- **`src/controllers/teacher.controller.ts`** — Receives HTTP requests for the teacher module, validates input, calls the service layer, and returns standardized responses.
- **`src/data/activity-templates/core-templates.ts`** — Contains the built-in activity-template registry such as MCQ, matching, reading, writing, and recording activities.
- **`src/data/curriculum/bm-pemulihan-2019.ts`** — Contains the structured Bahasa Melayu Pemulihan curriculum seed data.
- **`src/errors/app-error.ts`** — Defines structured application errors with code, HTTP status, message, and details.
- **`src/helpers/response.helper.ts`** — Standardizes successful API response format.
- **`src/integrations/gemini/gemini-models.ts`** — Defines the supported Gemini model names and model-selection rules.
- **`src/integrations/gemini/gemini.client.ts`** — Creates the Google Gemini client and sends AI generation requests.
- **`src/middleware/auth.middleware.ts`** — Reads Bearer JWT tokens, creates the authenticated session, and blocks users who must still change their first password or student PIN.
- **`src/middleware/error.middleware.ts`** — Converts application, validation, Prisma, and unexpected errors into consistent API responses.
- **`src/middleware/role.middleware.ts`** — Implements RBAC, school-level access, teacher permission grants, student self-access, and parent linked-child access.
- **`src/middleware/upload.middleware.ts`** — Configures Multer upload limits and accepted file handling.
- **`src/prisma/activity-template.seed.ts`** — Seeds the registered activity templates and renderer definitions.
- **`src/prisma/curriculum.seed.ts`** — Seeds the Bahasa Melayu remedial curriculum hierarchy.
- **`src/prisma/seed.ts`** — Main database seed entry point, including initial super-admin/setup records.
- **`src/routes/activity-template.routes.ts`** — Defines the Express endpoints and middleware chain for the activity template module.
- **`src/routes/admin.routes.ts`** — Defines the Express endpoints and middleware chain for the admin module.
- **`src/routes/ai.routes.ts`** — Defines the Express endpoints and middleware chain for the ai module.
- **`src/routes/assessment.routes.ts`** — Defines the Express endpoints and middleware chain for the assessment module.
- **`src/routes/assignment.routes.ts`** — Defines the Express endpoints and middleware chain for the assignment module.
- **`src/routes/audit.routes.ts`** — Defines the Express endpoints and middleware chain for the audit module.
- **`src/routes/auth.routes.ts`** — Defines the Express endpoints and middleware chain for the auth module.
- **`src/routes/curriculum.routes.ts`** — Defines the Express endpoints and middleware chain for the curriculum module.
- **`src/routes/dashboard.routes.ts`** — Defines the Express endpoints and middleware chain for the dashboard module.
- **`src/routes/digitalActivity.routes.ts`** — Defines the Express endpoints and middleware chain for the digitalActivity module.
- **`src/routes/media.routes.ts`** — Defines the Express endpoints and middleware chain for the media module.
- **`src/routes/notification.routes.ts`** — Defines the Express endpoints and middleware chain for the notification module.
- **`src/routes/parent-assessment.routes.ts`** — Defines the Express endpoints and middleware chain for the parent assessment module.
- **`src/routes/parent-assignment.routes.ts`** — Defines the Express endpoints and middleware chain for the parent assignment module.
- **`src/routes/parent-progress.routes.ts`** — Defines the Express endpoints and middleware chain for the parent progress module.
- **`src/routes/parent-submission.routes.ts`** — Defines the Express endpoints and middleware chain for the parent submission module.
- **`src/routes/parent.routes.ts`** — Defines the Express endpoints and middleware chain for the parent module.
- **`src/routes/parentStudent.routes.ts`** — Defines the Express endpoints and middleware chain for the parentStudent module.
- **`src/routes/pbd.routes.ts`** — Defines the Express endpoints and middleware chain for the pbd module.
- **`src/routes/profile.routes.ts`** — Defines the Express endpoints and middleware chain for the profile module.
- **`src/routes/question-bank.routes.ts`** — Defines the Express endpoints and middleware chain for the question bank module.
- **`src/routes/report.routes.ts`** — Defines the Express endpoints and middleware chain for the report module.
- **`src/routes/school.routes.ts`** — Defines the Express endpoints and middleware chain for the school module.
- **`src/routes/schoolClass.routes.ts`** — Defines the Express endpoints and middleware chain for the schoolClass module.
- **`src/routes/student-assessment.routes.ts`** — Defines the Express endpoints and middleware chain for the student assessment module.
- **`src/routes/student-assignment.routes.ts`** — Defines the Express endpoints and middleware chain for the student assignment module.
- **`src/routes/student-attempt.routes.ts`** — Defines the Express endpoints and middleware chain for the student attempt module.
- **`src/routes/student-progress.routes.ts`** — Defines the Express endpoints and middleware chain for the student progress module.
- **`src/routes/student-submission.routes.ts`** — Defines the Express endpoints and middleware chain for the student submission module.
- **`src/routes/student.routes.ts`** — Defines the Express endpoints and middleware chain for the student module.
- **`src/routes/submission.routes.ts`** — Defines the Express endpoints and middleware chain for the submission module.
- **`src/routes/teacher.routes.ts`** — Defines the Express endpoints and middleware chain for the teacher module.
- **`src/server.ts`** — Loads environment variables and starts the HTTP server, normally on port 3001.
- **`src/services/activity-template.service.ts`** — Contains the main business logic for the activity template module and communicates with Prisma or external integrations.
- **`src/services/admin.service.ts`** — Contains the main business logic for the admin module and communicates with Prisma or external integrations.
- **`src/services/ai/ai-data-minimization.service.ts`** — Contains the main business logic for the ai data minimization module and communicates with Prisma or external integrations.
- **`src/services/ai/ai-output.service.ts`** — Contains the main business logic for the ai output module and communicates with Prisma or external integrations.
- **`src/services/ai/ai-review-policy.ts`** — Contains the main business logic for the ai review policy.ts module and communicates with Prisma or external integrations.
- **`src/services/ai/ai-safety.service.ts`** — Contains the main business logic for the ai safety module and communicates with Prisma or external integrations.
- **`src/services/ai/ai.service.ts`** — Contains the main business logic for the ai module and communicates with Prisma or external integrations.
- **`src/services/analytics.service.ts`** — Contains the main business logic for the analytics module and communicates with Prisma or external integrations.
- **`src/services/announcement.service.ts`** — Contains the main business logic for the announcement module and communicates with Prisma or external integrations.
- **`src/services/assessment-auto.service.ts`** — Contains the main business logic for the assessment auto module and communicates with Prisma or external integrations.
- **`src/services/assessment-calculation.ts`** — Contains the main business logic for the assessment calculation.ts module and communicates with Prisma or external integrations.
- **`src/services/assessment-policy.ts`** — Contains the main business logic for the assessment policy.ts module and communicates with Prisma or external integrations.
- **`src/services/assessment.service.ts`** — Contains the main business logic for the assessment module and communicates with Prisma or external integrations.
- **`src/services/assignment.service.ts`** — Contains the main business logic for the assignment module and communicates with Prisma or external integrations.
- **`src/services/attempt.service.ts`** — Contains the main business logic for the attempt module and communicates with Prisma or external integrations.
- **`src/services/audit.service.ts`** — Contains the main business logic for the audit module and communicates with Prisma or external integrations.
- **`src/services/auth.service.ts`** — Contains the main business logic for the auth module and communicates with Prisma or external integrations.
- **`src/services/authorization.service.ts`** — Contains the main business logic for the authorization module and communicates with Prisma or external integrations.
- **`src/services/curriculum.service.ts`** — Contains the main business logic for the curriculum module and communicates with Prisma or external integrations.
- **`src/services/dashboard.service.ts`** — Contains the main business logic for the dashboard module and communicates with Prisma or external integrations.
- **`src/services/digitalActivity.service.ts`** — Contains the main business logic for the digitalActivity module and communicates with Prisma or external integrations.
- **`src/services/mastery-policy.ts`** — Contains the main business logic for the mastery policy.ts module and communicates with Prisma or external integrations.
- **`src/services/mastery-recommendation.service.ts`** — Contains the main business logic for the mastery recommendation module and communicates with Prisma or external integrations.
- **`src/services/mastery.service.ts`** — Contains the main business logic for the mastery module and communicates with Prisma or external integrations.
- **`src/services/media.service.ts`** — Contains the main business logic for the media module and communicates with Prisma or external integrations.
- **`src/services/notification-email.service.ts`** — Contains the main business logic for the notification email module and communicates with Prisma or external integrations.
- **`src/services/notification-policy.ts`** — Contains the main business logic for the notification policy.ts module and communicates with Prisma or external integrations.
- **`src/services/notification-scheduler.service.ts`** — Contains the main business logic for the notification scheduler module and communicates with Prisma or external integrations.
- **`src/services/notification.service.ts`** — Contains the main business logic for the notification module and communicates with Prisma or external integrations.
- **`src/services/parent.service.ts`** — Contains the main business logic for the parent module and communicates with Prisma or external integrations.
- **`src/services/parentStudent.service.ts`** — Contains the main business logic for the parentStudent module and communicates with Prisma or external integrations.
- **`src/services/pbd-evidence.service.ts`** — Contains the main business logic for the pbd evidence module and communicates with Prisma or external integrations.
- **`src/services/pbd.service.ts`** — Contains the main business logic for the pbd module and communicates with Prisma or external integrations.
- **`src/services/profile.service.ts`** — Contains the main business logic for the profile module and communicates with Prisma or external integrations.
- **`src/services/question-bank.service.ts`** — Contains the main business logic for the question bank module and communicates with Prisma or external integrations.
- **`src/services/report-policy.ts`** — Contains the main business logic for the report policy.ts module and communicates with Prisma or external integrations.
- **`src/services/report.service.ts`** — Contains the main business logic for the report module and communicates with Prisma or external integrations.
- **`src/services/school.service.ts`** — Contains the main business logic for the school module and communicates with Prisma or external integrations.
- **`src/services/schoolClass.service.ts`** — Contains the main business logic for the schoolClass module and communicates with Prisma or external integrations.
- **`src/services/student.service.ts`** — Contains the main business logic for the student module and communicates with Prisma or external integrations.
- **`src/services/submission-review-policy.ts`** — Contains the main business logic for the submission review policy.ts module and communicates with Prisma or external integrations.
- **`src/services/submission.service.ts`** — Contains the main business logic for the submission module and communicates with Prisma or external integrations.
- **`src/services/teacher.service.ts`** — Contains the main business logic for the teacher module and communicates with Prisma or external integrations.
- **`src/storage/index.ts`** — Exports the selected storage service.
- **`src/storage/local-storage.adapter.ts`** — Stores uploaded media on the local filesystem.
- **`src/storage/storage.config.ts`** — Reads and validates storage-related environment configuration.
- **`src/storage/storage.service.ts`** — Provides common upload, download, and deletion operations independent of the storage provider.
- **`src/storage/storage.types.ts`** — Defines storage adapter and media metadata TypeScript contracts.
- **`src/types/google-genai.d.ts`** — Type declarations used to satisfy or extend external library typings.
- **`src/utils/bcrypt.ts`** — Reusable utility for bcrypt.
- **`src/utils/generateIds.ts`** — Reusable utility for generateIds.
- **`src/utils/generateSetupToken.ts`** — Reusable utility for generateSetupToken.
- **`src/utils/jwt.ts`** — Reusable utility for jwt.
- **`src/utils/phone.ts`** — Reusable utility for phone.
- **`src/utils/safe-json-schema.ts`** — Reusable utility for safe json schema.
- **`src/validators/activity-template.validator.ts`** — Defines Zod schemas and validation rules for activity template requests.
- **`src/validators/admin.validator.ts`** — Defines Zod schemas and validation rules for admin requests.
- **`src/validators/ai.validator.ts`** — Defines Zod schemas and validation rules for ai requests.
- **`src/validators/assessment.validator.ts`** — Defines Zod schemas and validation rules for assessment requests.
- **`src/validators/assignment.validator.ts`** — Defines Zod schemas and validation rules for assignment requests.
- **`src/validators/attempt.validator.ts`** — Defines Zod schemas and validation rules for attempt requests.
- **`src/validators/audit.validator.ts`** — Defines Zod schemas and validation rules for audit requests.
- **`src/validators/auth.validator.ts`** — Defines Zod schemas and validation rules for auth requests.
- **`src/validators/curriculum.validator.ts`** — Defines Zod schemas and validation rules for curriculum requests.
- **`src/validators/dashboard.validator.ts`** — Defines Zod schemas and validation rules for dashboard requests.
- **`src/validators/digitalActivity.validator.ts`** — Defines Zod schemas and validation rules for digitalActivity requests.
- **`src/validators/media.validator.ts`** — Defines Zod schemas and validation rules for media requests.
- **`src/validators/notification.validator.ts`** — Defines Zod schemas and validation rules for notification requests.
- **`src/validators/parent.validator.ts`** — Defines Zod schemas and validation rules for parent requests.
- **`src/validators/parentStudent.validator.ts`** — Defines Zod schemas and validation rules for parentStudent requests.
- **`src/validators/pbd.validator.ts`** — Defines Zod schemas and validation rules for pbd requests.
- **`src/validators/profile.validator.ts`** — Defines Zod schemas and validation rules for profile requests.
- **`src/validators/question-bank.validator.ts`** — Defines Zod schemas and validation rules for question bank requests.
- **`src/validators/report.validator.ts`** — Defines Zod schemas and validation rules for report requests.
- **`src/validators/school.validator.ts`** — Defines Zod schemas and validation rules for school requests.
- **`src/validators/schoolClass.validator.ts`** — Defines Zod schemas and validation rules for schoolClass requests.
- **`src/validators/student.validator.ts`** — Defines Zod schemas and validation rules for student requests.
- **`src/validators/submission.validator.ts`** — Defines Zod schemas and validation rules for submission requests.
- **`src/validators/teacher.validator.ts`** — Defines Zod schemas and validation rules for teacher requests.
- **`test/activity-template.registry.test.ts`** — Automated contract/module test for activity template.registry.
- **`test/admin.service.test.ts`** — Automated contract/module test for admin.service.
- **`test/arrange-letters.contract.test.ts`** — Automated contract/module test for arrange letters.contract.
- **`test/arrange-syllables.contract.test.ts`** — Automated contract/module test for arrange syllables.contract.
- **`test/assessment.engine.test.ts`** — Automated contract/module test for assessment.engine.
- **`test/assignment.validator.test.ts`** — Automated contract/module test for assignment.validator.
- **`test/audit.migration.test.ts`** — Automated contract/module test for audit.migration.
- **`test/audit.service.test.ts`** — Automated contract/module test for audit.service.
- **`test/auth.first-password.test.ts`** — Automated contract/module test for auth.first password.
- **`test/auth.middleware.test.ts`** — Automated contract/module test for auth.middleware.
- **`test/auth.service.test.ts`** — Automated contract/module test for auth.service.
- **`test/auth.student.test.ts`** — Automated contract/module test for auth.student.
- **`test/authorization.middleware.test.ts`** — Automated contract/module test for authorization.middleware.
- **`test/authorization.service.test.ts`** — Automated contract/module test for authorization.service.
- **`test/copy-writing.contract.test.ts`** — Automated contract/module test for copy writing.contract.
- **`test/curriculum.migration.test.ts`** — Automated contract/module test for curriculum.migration.
- **`test/curriculum.seed-data.test.ts`** — Automated contract/module test for curriculum.seed data.
- **`test/curriculum.validator.test.ts`** — Automated contract/module test for curriculum.validator.
- **`test/dashboard.module.test.ts`** — Automated contract/module test for dashboard.module.
- **`test/digital-activity.validator.test.ts`** — Automated contract/module test for digital activity.validator.
- **`test/fill-blank.contract.test.ts`** — Automated contract/module test for fill blank.contract.
- **`test/free-handwriting.contract.test.ts`** — Automated contract/module test for free handwriting.contract.
- **`test/media.storage.test.ts`** — Automated contract/module test for media.storage.
- **`test/notification.module.test.ts`** — Automated contract/module test for notification.module.
- **`test/parent.module.test.ts`** — Automated contract/module test for parent.module.
- **`test/pbd.module.test.ts`** — Automated contract/module test for pbd.module.
- **`test/profile.module.test.ts`** — Automated contract/module test for profile.module.
- **`test/question-bank-template.migration.test.ts`** — Automated contract/module test for question bank template.migration.
- **`test/question-bank.validator.test.ts`** — Automated contract/module test for question bank.validator.
- **`test/reading-comprehension.contract.test.ts`** — Automated contract/module test for reading comprehension.contract.
- **`test/reading.contract.test.ts`** — Automated contract/module test for reading.contract.
- **`test/report.module.test.ts`** — Automated contract/module test for report.module.
- **`test/school.service.test.ts`** — Automated contract/module test for school.service.
- **`test/schoolClass.module.test.ts`** — Automated contract/module test for schoolClass.module.
- **`test/seed.super-admin.test.ts`** — Automated contract/module test for seed.super admin.
- **`test/student-delivery.contract.test.ts`** — Automated contract/module test for student delivery.contract.
- **`test/student.module.test.ts`** — Automated contract/module test for student.module.
- **`test/submission.validator.test.ts`** — Automated contract/module test for submission.validator.
- **`test/teacher.service.test.ts`** — Automated contract/module test for teacher.service.
- **`test/tracing.contract.test.ts`** — Automated contract/module test for tracing.contract.
- **`test/voice-recording.contract.test.ts`** — Automated contract/module test for voice recording.contract.
- **`test/word-builder.contract.test.ts`** — Automated contract/module test for word builder.contract.

## 11. Test and build verification

- The uploaded ZIP included generated `node_modules` and `dist` folders. Those should not be committed or shared.
- I attempted a clean dependency installation and typecheck. The installation exceeded the available execution window and left dependencies incomplete, so a reliable full test result could not be produced from this extracted copy.
- Run locally from the backend folder:

```bash
rm -rf node_modules dist
npm ci
npx prisma generate
npm run typecheck
npm test
npm run build
```

- Ensure `.env` is not committed. The uploaded ZIP contains a `.env` file; rotate any real database, JWT, email, storage or Gemini secrets that may have been included.

## 12. Final assessment

The backend architecture is compatible with the inspected frontend and covers the intended Digital MoLIB production workflow. The two sides are not separate unfinished systems: they are designed around the same roles, entities and endpoint names. The strongest parts are RBAC/ownership middleware, curriculum-to-assessment data flow, activity contracts, teacher review, PBD mastery, tests, AI human-review policy and notification support. Before production deployment, prioritize secret rotation, strict CORS, persistent cloud storage, environment validation, complete CI tests, API response-contract tests against the frontend, and endpoint-by-endpoint role testing.