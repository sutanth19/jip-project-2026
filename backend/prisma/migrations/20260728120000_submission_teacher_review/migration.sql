CREATE TYPE "SubmissionStatus" AS ENUM ('PENDING_REVIEW', 'IN_REVIEW', 'REVISION_REQUIRED', 'REVIEWED', 'CANCELLED', 'ARCHIVED');
CREATE TYPE "ReviewDecision" AS ENUM ('APPROVED', 'REVISION_REQUIRED');
CREATE TYPE "ItemReviewStatus" AS ENUM ('NOT_REQUIRED', 'PENDING', 'REVIEWED', 'REVISION_REQUIRED');
CREATE TYPE "ReviewSource" AS ENUM ('TEACHER', 'SYSTEM');

CREATE TABLE "submissions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "attemptId" UUID NOT NULL,
    "assignmentId" UUID NOT NULL,
    "studentId" UUID NOT NULL,
    "schoolId" UUID NOT NULL,
    "parentSubmissionId" UUID,
    "status" "SubmissionStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
    "revisionNumber" INTEGER NOT NULL DEFAULT 1,
    "submittedAt" TIMESTAMP(3) NOT NULL,
    "reviewStartedAt" TIMESTAMP(3),
    "reviewedAt" TIMESTAMP(3),
    "returnedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "submissions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "teacher_reviews" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "submissionId" UUID NOT NULL,
    "teacherId" UUID NOT NULL,
    "decision" "ReviewDecision" NOT NULL,
    "source" "ReviewSource" NOT NULL DEFAULT 'TEACHER',
    "overallFeedback" TEXT,
    "internalNotes" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "teacher_reviews_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "submission_item_reviews" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "submissionId" UUID NOT NULL,
    "activityItemId" UUID NOT NULL,
    "teacherId" UUID,
    "status" "ItemReviewStatus" NOT NULL DEFAULT 'PENDING',
    "feedback" TEXT,
    "internalNotes" TEXT,
    "observedResponse" JSONB,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "submission_item_reviews_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "submissions_attemptId_key" ON "submissions"("attemptId");
CREATE INDEX "submissions_assignmentId_idx" ON "submissions"("assignmentId");
CREATE INDEX "submissions_studentId_idx" ON "submissions"("studentId");
CREATE INDEX "submissions_schoolId_idx" ON "submissions"("schoolId");
CREATE INDEX "submissions_status_idx" ON "submissions"("status");
CREATE INDEX "submissions_submittedAt_idx" ON "submissions"("submittedAt");
CREATE INDEX "submissions_schoolId_status_idx" ON "submissions"("schoolId", "status");
CREATE INDEX "submissions_assignmentId_status_idx" ON "submissions"("assignmentId", "status");
CREATE INDEX "submissions_parentSubmissionId_idx" ON "submissions"("parentSubmissionId");
CREATE INDEX "teacher_reviews_submissionId_idx" ON "teacher_reviews"("submissionId");
CREATE INDEX "teacher_reviews_teacherId_idx" ON "teacher_reviews"("teacherId");
CREATE INDEX "teacher_reviews_decision_idx" ON "teacher_reviews"("decision");
CREATE INDEX "teacher_reviews_completedAt_idx" ON "teacher_reviews"("completedAt");
CREATE UNIQUE INDEX "submission_item_reviews_submissionId_activityItemId_key" ON "submission_item_reviews"("submissionId", "activityItemId");
CREATE INDEX "submission_item_reviews_activityItemId_idx" ON "submission_item_reviews"("activityItemId");
CREATE INDEX "submission_item_reviews_teacherId_idx" ON "submission_item_reviews"("teacherId");
CREATE INDEX "submission_item_reviews_status_idx" ON "submission_item_reviews"("status");

ALTER TABLE "submissions" ADD CONSTRAINT "submissions_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "student_attempts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "assignments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_parentSubmissionId_fkey" FOREIGN KEY ("parentSubmissionId") REFERENCES "submissions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "teacher_reviews" ADD CONSTRAINT "teacher_reviews_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "submissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "teacher_reviews" ADD CONSTRAINT "teacher_reviews_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "teachers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "submission_item_reviews" ADD CONSTRAINT "submission_item_reviews_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "submissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "submission_item_reviews" ADD CONSTRAINT "submission_item_reviews_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "teachers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
