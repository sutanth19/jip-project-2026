CREATE TYPE "MasteryLevel" AS ENUM ('NOT_STARTED', 'EMERGING', 'DEVELOPING', 'ACHIEVED', 'MASTERED');
CREATE TYPE "MasteryStatus" AS ENUM ('PENDING', 'RECOMMENDED', 'CONFIRMED', 'OVERRIDDEN', 'SUPERSEDED', 'ARCHIVED');
CREATE TYPE "EvidenceType" AS ENUM ('AUTOMATIC_ASSESSMENT', 'MANUAL_ASSESSMENT', 'TEACHER_OBSERVATION', 'ACTIVITY_COMPLETION', 'REVISION');
CREATE TYPE "EvidenceStrength" AS ENUM ('SUPPORTING', 'STANDARD', 'STRONG');
CREATE TYPE "MasteryDecisionSource" AS ENUM ('SYSTEM_RECOMMENDATION', 'TEACHER_JUDGMENT', 'TEACHER_OVERRIDE');
CREATE TYPE "ProgressTrend" AS ENUM ('INSUFFICIENT_DATA', 'DECLINING', 'STABLE', 'IMPROVING');

CREATE TABLE "pbd_evidence" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "sourceKey" TEXT NOT NULL,
  "studentId" UUID NOT NULL,
  "schoolId" UUID NOT NULL,
  "assessmentId" UUID,
  "assessmentItemId" UUID,
  "submissionId" UUID,
  "assignmentId" UUID,
  "digitalActivityId" UUID,
  "curriculumVersionId" UUID NOT NULL,
  "programmeId" UUID NOT NULL,
  "remedialSkillId" UUID NOT NULL,
  "learningStandardId" UUID,
  "learningObjectiveId" UUID,
  "evidenceType" "EvidenceType" NOT NULL,
  "strength" "EvidenceStrength" NOT NULL DEFAULT 'STANDARD',
  "awardedMarks" DECIMAL(10,2),
  "possibleMarks" DECIMAL(10,2),
  "percentage" DECIMAL(5,2),
  "completionOnly" BOOLEAN NOT NULL DEFAULT false,
  "observedLevel" "MasteryLevel",
  "isValid" BOOLEAN NOT NULL DEFAULT true,
  "invalidatedAt" TIMESTAMP(3),
  "invalidationReason" TEXT,
  "observedAt" TIMESTAMP(3) NOT NULL,
  "recordedByTeacherId" UUID,
  "summary" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "pbd_evidence_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "student_mastery" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "studentId" UUID NOT NULL,
  "schoolId" UUID NOT NULL,
  "curriculumVersionId" UUID NOT NULL,
  "programmeId" UUID NOT NULL,
  "remedialSkillId" UUID NOT NULL,
  "learningStandardId" UUID,
  "scopeKey" TEXT NOT NULL,
  "currentLevel" "MasteryLevel" NOT NULL,
  "status" "MasteryStatus" NOT NULL,
  "decisionSource" "MasteryDecisionSource" NOT NULL,
  "recommendedLevel" "MasteryLevel",
  "recommendedConfidence" DECIMAL(5,2),
  "recommendedAt" TIMESTAMP(3),
  "confidencePercentage" DECIMAL(5,2),
  "evidenceCount" INTEGER NOT NULL DEFAULT 0,
  "activityCount" INTEGER NOT NULL DEFAULT 0,
  "trend" "ProgressTrend" NOT NULL DEFAULT 'INSUFFICIENT_DATA',
  "latestEvidenceAt" TIMESTAMP(3),
  "confirmedByTeacherId" UUID,
  "confirmedAt" TIMESTAMP(3),
  "teacherNote" TEXT,
  "archivedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "student_mastery_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "student_mastery_history" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "studentMasteryId" UUID NOT NULL,
  "previousLevel" "MasteryLevel",
  "newLevel" "MasteryLevel" NOT NULL,
  "previousStatus" "MasteryStatus",
  "newStatus" "MasteryStatus" NOT NULL,
  "decisionSource" "MasteryDecisionSource" NOT NULL,
  "evidenceCount" INTEGER NOT NULL,
  "confidencePercentage" DECIMAL(5,2),
  "decidedByTeacherId" UUID,
  "reason" TEXT,
  "teacherNote" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "student_mastery_history_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "pbd_evidence_sourceKey_key" ON "pbd_evidence"("sourceKey");
CREATE INDEX "pbd_evidence_studentId_idx" ON "pbd_evidence"("studentId");
CREATE INDEX "pbd_evidence_schoolId_idx" ON "pbd_evidence"("schoolId");
CREATE INDEX "pbd_evidence_assessmentId_idx" ON "pbd_evidence"("assessmentId");
CREATE INDEX "pbd_evidence_remedialSkillId_idx" ON "pbd_evidence"("remedialSkillId");
CREATE INDEX "pbd_evidence_learningStandardId_idx" ON "pbd_evidence"("learningStandardId");
CREATE INDEX "pbd_evidence_studentId_remedialSkillId_idx" ON "pbd_evidence"("studentId", "remedialSkillId");
CREATE INDEX "pbd_evidence_studentId_learningStandardId_idx" ON "pbd_evidence"("studentId", "learningStandardId");
CREATE INDEX "pbd_evidence_observedAt_idx" ON "pbd_evidence"("observedAt");

CREATE UNIQUE INDEX "student_mastery_studentId_curriculumVersionId_scopeKey_key" ON "student_mastery"("studentId", "curriculumVersionId", "scopeKey");
CREATE INDEX "student_mastery_studentId_idx" ON "student_mastery"("studentId");
CREATE INDEX "student_mastery_schoolId_idx" ON "student_mastery"("schoolId");
CREATE INDEX "student_mastery_remedialSkillId_idx" ON "student_mastery"("remedialSkillId");
CREATE INDEX "student_mastery_learningStandardId_idx" ON "student_mastery"("learningStandardId");
CREATE INDEX "student_mastery_currentLevel_idx" ON "student_mastery"("currentLevel");
CREATE INDEX "student_mastery_status_idx" ON "student_mastery"("status");
CREATE INDEX "student_mastery_history_studentMasteryId_idx" ON "student_mastery_history"("studentMasteryId");
CREATE INDEX "student_mastery_history_newLevel_idx" ON "student_mastery_history"("newLevel");
CREATE INDEX "student_mastery_history_createdAt_idx" ON "student_mastery_history"("createdAt");

ALTER TABLE "pbd_evidence" ADD CONSTRAINT "pbd_evidence_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "pbd_evidence" ADD CONSTRAINT "pbd_evidence_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "pbd_evidence" ADD CONSTRAINT "pbd_evidence_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "assessments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "pbd_evidence" ADD CONSTRAINT "pbd_evidence_assessmentItemId_fkey" FOREIGN KEY ("assessmentItemId") REFERENCES "assessment_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "pbd_evidence" ADD CONSTRAINT "pbd_evidence_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "submissions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "pbd_evidence" ADD CONSTRAINT "pbd_evidence_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "assignments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "pbd_evidence" ADD CONSTRAINT "pbd_evidence_digitalActivityId_fkey" FOREIGN KEY ("digitalActivityId") REFERENCES "digital_activities"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "pbd_evidence" ADD CONSTRAINT "pbd_evidence_curriculumVersionId_fkey" FOREIGN KEY ("curriculumVersionId") REFERENCES "curriculum_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "pbd_evidence" ADD CONSTRAINT "pbd_evidence_programmeId_fkey" FOREIGN KEY ("programmeId") REFERENCES "curriculum_programmes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "pbd_evidence" ADD CONSTRAINT "pbd_evidence_remedialSkillId_fkey" FOREIGN KEY ("remedialSkillId") REFERENCES "remedial_skills"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "pbd_evidence" ADD CONSTRAINT "pbd_evidence_learningStandardId_fkey" FOREIGN KEY ("learningStandardId") REFERENCES "learning_standards"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "pbd_evidence" ADD CONSTRAINT "pbd_evidence_learningObjectiveId_fkey" FOREIGN KEY ("learningObjectiveId") REFERENCES "learning_objectives"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "pbd_evidence" ADD CONSTRAINT "pbd_evidence_recordedByTeacherId_fkey" FOREIGN KEY ("recordedByTeacherId") REFERENCES "teachers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "student_mastery" ADD CONSTRAINT "student_mastery_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "student_mastery" ADD CONSTRAINT "student_mastery_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "student_mastery" ADD CONSTRAINT "student_mastery_curriculumVersionId_fkey" FOREIGN KEY ("curriculumVersionId") REFERENCES "curriculum_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "student_mastery" ADD CONSTRAINT "student_mastery_programmeId_fkey" FOREIGN KEY ("programmeId") REFERENCES "curriculum_programmes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "student_mastery" ADD CONSTRAINT "student_mastery_remedialSkillId_fkey" FOREIGN KEY ("remedialSkillId") REFERENCES "remedial_skills"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "student_mastery" ADD CONSTRAINT "student_mastery_learningStandardId_fkey" FOREIGN KEY ("learningStandardId") REFERENCES "learning_standards"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "student_mastery" ADD CONSTRAINT "student_mastery_confirmedByTeacherId_fkey" FOREIGN KEY ("confirmedByTeacherId") REFERENCES "teachers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "student_mastery_history" ADD CONSTRAINT "student_mastery_history_studentMasteryId_fkey" FOREIGN KEY ("studentMasteryId") REFERENCES "student_mastery"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "student_mastery_history" ADD CONSTRAINT "student_mastery_history_decidedByTeacherId_fkey" FOREIGN KEY ("decidedByTeacherId") REFERENCES "teachers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
