import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";


import authRoutes from "./routes/auth.routes.js";
import adminRoutes from "./routes/admin.routes.js";
import schoolRoutes from "./routes/school.routes.js";
import teacherRoutes from "./routes/teacher.routes.js";
import parentRoutes from "./routes/parent.routes.js";
import studentRoutes from "./routes/student.routes.js";
import schoolClassRoutes from "./routes/schoolClass.routes.js";
import parentStudentRoutes from "./routes/parentStudent.routes.js";
import dashboardRoutes from "./routes/dashboard.routes.js";
import mediaRoutes from "./routes/media.routes.js";
import auditRoutes from "./routes/audit.routes.js";
import profileRoutes from "./routes/profile.routes.js";
import curriculumRoutes from "./routes/curriculum.routes.js";
import questionBankRoutes from "./routes/question-bank.routes.js";
import activityTemplateRoutes from "./routes/activity-template.routes.js";
import digitalActivityRoutes from "./routes/digitalActivity.routes.js";
import assignmentRoutes from "./routes/assignment.routes.js";
import studentAssignmentRoutes from "./routes/student-assignment.routes.js";
import parentAssignmentRoutes from "./routes/parent-assignment.routes.js";
import studentAttemptRoutes from "./routes/student-attempt.routes.js";
import submissionRoutes from "./routes/submission.routes.js";
import studentSubmissionRoutes from "./routes/student-submission.routes.js";
import parentSubmissionRoutes from "./routes/parent-submission.routes.js";
import assessmentRoutes from "./routes/assessment.routes.js";
import studentAssessmentRoutes from "./routes/student-assessment.routes.js";
import parentAssessmentRoutes from "./routes/parent-assessment.routes.js";
import pbdRoutes from "./routes/pbd.routes.js";
import studentProgressRoutes from "./routes/student-progress.routes.js";
import parentProgressRoutes from "./routes/parent-progress.routes.js";
import reportRoutes from "./routes/report.routes.js";
import aiRoutes from "./routes/ai.routes.js";
import notificationRoutes from "./routes/notification.routes.js";
import { errorHandler } from "./middleware/error.middleware.js";

const app = express();
const rawAllowedOrigins = [process.env.FRONTEND_URL, process.env.APP_URL]
  .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
  .map((value) => value.trim().replace(/\/$/, ""));
const developmentOrigins = ["http://localhost:5173", "http://127.0.0.1:5173"];
const allowedOrigins = new Set([...developmentOrigins, ...rawAllowedOrigins]);

app.use(helmet());
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.has(origin.replace(/\/$/, ""))) {
        callback(null, true);
        return;
      }

      callback(new Error("CORS_NOT_ALLOWED"));
    },
    credentials: false,
    methods: ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 100,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api/auth", authRoutes);
app.use("/api/admins", adminRoutes);
app.use("/api/schools", schoolRoutes);
app.use("/api/teachers", teacherRoutes);
app.use("/api/parents", parentRoutes);
app.use("/api/students", studentRoutes);
app.use("/api/classes", schoolClassRoutes);
app.use("/api/parent-students", parentStudentRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/media", mediaRoutes);
app.use("/api/audit-logs", auditRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/curriculum", curriculumRoutes);
app.use("/api/question-bank", questionBankRoutes);
app.use("/api/activity-templates", activityTemplateRoutes);
app.use("/api/digital-activities", digitalActivityRoutes);
app.use("/api/assignments", assignmentRoutes);
app.use("/api/student", studentAssignmentRoutes);
app.use("/api/student/attempts", studentAttemptRoutes);
app.use("/api/submissions", submissionRoutes);
app.use("/api/student/submissions", studentSubmissionRoutes);
app.use("/api/parent", parentAssignmentRoutes);
app.use("/api/parent", parentSubmissionRoutes);
app.use("/api/assessments", assessmentRoutes);
app.use("/api/student/assessments", studentAssessmentRoutes);
app.use("/api/parent", parentAssessmentRoutes);
app.use("/api/pbd", pbdRoutes);
app.use("/api/student", studentProgressRoutes);
app.use("/api/parent", parentProgressRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api", notificationRoutes);

app.get("/", (_req, res) => {
  res.json({
    success: true,
    message: "School Literacy System API is running 🚀",
  });
});

app.use((_req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found.",
  });
});

app.use(errorHandler);

export default app;
