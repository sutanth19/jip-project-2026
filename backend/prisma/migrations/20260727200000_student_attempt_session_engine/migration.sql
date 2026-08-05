CREATE TYPE "AttemptStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'SUBMITTED', 'EXPIRED', 'CANCELLED');

CREATE TABLE "student_attempts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "assignmentId" UUID NOT NULL,
    "studentId" UUID NOT NULL,
    "attemptNumber" INTEGER NOT NULL,
    "status" "AttemptStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "startedAt" TIMESTAMP(3),
    "submittedAt" TIMESTAMP(3),
    "lastSavedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "totalDurationSeconds" INTEGER,
    "deviceInfo" JSONB,
    "browserInfo" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "student_attempts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "assignment_sessions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "attemptId" UUID NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastHeartbeat" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "assignment_sessions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "student_answers" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "attemptId" UUID NOT NULL,
    "activityItemId" UUID NOT NULL,
    "answerJson" JSONB NOT NULL,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "timeSpentSeconds" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "student_answers_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "student_attempts_assignmentId_studentId_attemptNumber_key" ON "student_attempts"("assignmentId", "studentId", "attemptNumber");
CREATE INDEX "student_attempts_assignmentId_studentId_idx" ON "student_attempts"("assignmentId", "studentId");
CREATE INDEX "student_attempts_studentId_status_idx" ON "student_attempts"("studentId", "status");
CREATE UNIQUE INDEX "assignment_sessions_attemptId_key" ON "assignment_sessions"("attemptId");
CREATE UNIQUE INDEX "assignment_sessions_sessionToken_key" ON "assignment_sessions"("sessionToken");
CREATE INDEX "assignment_sessions_sessionToken_idx" ON "assignment_sessions"("sessionToken");
CREATE UNIQUE INDEX "student_answers_attemptId_activityItemId_key" ON "student_answers"("attemptId", "activityItemId");
CREATE INDEX "student_answers_attemptId_idx" ON "student_answers"("attemptId");

ALTER TABLE "student_attempts" ADD CONSTRAINT "student_attempts_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "assignments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "student_attempts" ADD CONSTRAINT "student_attempts_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "assignment_sessions" ADD CONSTRAINT "assignment_sessions_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "student_attempts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "student_answers" ADD CONSTRAINT "student_answers_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "student_attempts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
