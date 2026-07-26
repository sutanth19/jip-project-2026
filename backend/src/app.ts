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
import { errorHandler } from "./middleware/error.middleware.js";

const app = express();

app.use(helmet());
app.use(cors());

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
