CREATE TYPE "AssessmentStatus" AS ENUM ('PENDING', 'AUTO_ASSESSED', 'PARTIALLY_ASSESSED', 'COMPLETED', 'INVALIDATED', 'ARCHIVED');
CREATE TYPE "AssessmentMethod" AS ENUM ('AUTOMATIC', 'MANUAL', 'HYBRID', 'COMPLETION');
CREATE TYPE "AssessmentResult" AS ENUM ('PASSED', 'FAILED', 'COMPLETED', 'NOT_APPLICABLE');
CREATE TYPE "AssessmentItemStatus" AS ENUM ('PENDING', 'AUTO_ASSESSED', 'MANUALLY_ASSESSED', 'NOT_ASSESSED');
CREATE TYPE "MarkAdjustmentReason" AS ENUM ('TEACHER_CORRECTION', 'REVIEW_APPEAL', 'TECHNICAL_ERROR', 'ADMIN_CORRECTION');

CREATE TABLE "assessments" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "submissionId" UUID NOT NULL,
  "attemptId" UUID NOT NULL,
  "assignmentId" UUID NOT NULL,
  "studentId" UUID NOT NULL,
  "schoolId" UUID NOT NULL,
  "teacherId" UUID,
  "status" "AssessmentStatus" NOT NULL DEFAULT 'PENDING',
  "method" "AssessmentMethod" NOT NULL,
  "result" "AssessmentResult" NOT NULL DEFAULT 'NOT_APPLICABLE',
  "automaticMarks" DECIMAL(10,2) NOT NULL DEFAULT 0,
  "manualMarks" DECIMAL(10,2) NOT NULL DEFAULT 0,
  "adjustedMarks" DECIMAL(10,2) NOT NULL DEFAULT 0,
  "finalMarks" DECIMAL(10,2) NOT NULL DEFAULT 0,
  "possibleMarks" DECIMAL(10,2) NOT NULL DEFAULT 0,
  "percentage" DECIMAL(5,2),
  "passPercentage" DECIMAL(5,2),
  "overallFeedback" TEXT,
  "assessedAt" TIMESTAMP(3),
  "invalidatedAt" TIMESTAMP(3),
  "archivedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "assessments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "assessment_items" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "assessmentId" UUID NOT NULL,
  "activityItemId" UUID NOT NULL,
  "teacherId" UUID,
  "method" "AssessmentMethod" NOT NULL,
  "status" "AssessmentItemStatus" NOT NULL DEFAULT 'PENDING',
  "correct" BOOLEAN,
  "marksAwarded" DECIMAL(10,2) NOT NULL DEFAULT 0,
  "possibleMarks" DECIMAL(10,2) NOT NULL DEFAULT 0,
  "feedback" JSONB,
  "teacherFeedback" TEXT,
  "internalNotes" TEXT,
  "assessedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "assessment_items_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "assessment_adjustments" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "assessmentId" UUID NOT NULL,
  "teacherId" UUID,
  "adjustedByUserId" UUID NOT NULL,
  "reason" "MarkAdjustmentReason" NOT NULL,
  "previousMarks" DECIMAL(10,2) NOT NULL,
  "newMarks" DECIMAL(10,2) NOT NULL,
  "difference" DECIMAL(10,2) NOT NULL,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "assessment_adjustments_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "assessments_submissionId_key" ON "assessments"("submissionId");
CREATE UNIQUE INDEX "assessments_attemptId_key" ON "assessments"("attemptId");
CREATE INDEX "assessments_assignmentId_idx" ON "assessments"("assignmentId");
CREATE INDEX "assessments_studentId_idx" ON "assessments"("studentId");
CREATE INDEX "assessments_schoolId_idx" ON "assessments"("schoolId");
CREATE INDEX "assessments_teacherId_idx" ON "assessments"("teacherId");
CREATE INDEX "assessments_status_idx" ON "assessments"("status");
CREATE INDEX "assessments_method_idx" ON "assessments"("method");
CREATE INDEX "assessments_result_idx" ON "assessments"("result");
CREATE INDEX "assessments_createdAt_idx" ON "assessments"("createdAt");
CREATE INDEX "assessments_schoolId_status_idx" ON "assessments"("schoolId", "status");

CREATE UNIQUE INDEX "assessment_items_assessmentId_activityItemId_key" ON "assessment_items"("assessmentId", "activityItemId");
CREATE INDEX "assessment_items_activityItemId_idx" ON "assessment_items"("activityItemId");
CREATE INDEX "assessment_items_teacherId_idx" ON "assessment_items"("teacherId");
CREATE INDEX "assessment_items_status_idx" ON "assessment_items"("status");
CREATE INDEX "assessment_items_method_idx" ON "assessment_items"("method");

CREATE INDEX "assessment_adjustments_assessmentId_idx" ON "assessment_adjustments"("assessmentId");
CREATE INDEX "assessment_adjustments_teacherId_idx" ON "assessment_adjustments"("teacherId");
CREATE INDEX "assessment_adjustments_adjustedByUserId_idx" ON "assessment_adjustments"("adjustedByUserId");
CREATE INDEX "assessment_adjustments_reason_idx" ON "assessment_adjustments"("reason");
CREATE INDEX "assessment_adjustments_createdAt_idx" ON "assessment_adjustments"("createdAt");

ALTER TABLE "assessments" ADD CONSTRAINT "assessments_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "submissions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "assessments" ADD CONSTRAINT "assessments_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "student_attempts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "assessments" ADD CONSTRAINT "assessments_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "assignments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "assessments" ADD CONSTRAINT "assessments_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "assessments" ADD CONSTRAINT "assessments_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "assessments" ADD CONSTRAINT "assessments_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "teachers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "assessment_items" ADD CONSTRAINT "assessment_items_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "assessments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "assessment_items" ADD CONSTRAINT "assessment_items_activityItemId_fkey" FOREIGN KEY ("activityItemId") REFERENCES "digital_activity_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "assessment_items" ADD CONSTRAINT "assessment_items_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "teachers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "assessment_adjustments" ADD CONSTRAINT "assessment_adjustments_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "assessments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "assessment_adjustments" ADD CONSTRAINT "assessment_adjustments_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "teachers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
