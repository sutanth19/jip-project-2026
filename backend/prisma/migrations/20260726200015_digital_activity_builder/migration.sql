-- CreateEnum
CREATE TYPE "LearningDifficulty" AS ENUM ('BASIC', 'INTERMEDIATE', 'ADVANCED');

-- CreateEnum
CREATE TYPE "DigitalActivityStatus" AS ENUM ('DRAFT', 'IN_REVIEW', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ActivityScoringMode" AS ENUM ('NONE', 'TOTAL_SCORE', 'PERCENTAGE', 'MASTERY_THRESHOLD');

-- CreateEnum
CREATE TYPE "ActivityReviewMode" AS ENUM ('AUTO', 'TEACHER', 'HYBRID', 'AI_ASSISTED');

-- CreateTable
CREATE TABLE "digital_activities" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "instructions" TEXT NOT NULL,
    "learningOutcome" TEXT,
    "programmeId" UUID NOT NULL,
    "activityTemplateId" UUID NOT NULL,
    "createdByUserId" UUID NOT NULL,
    "updatedByUserId" UUID,
    "difficulty" "LearningDifficulty" NOT NULL,
    "status" "DigitalActivityStatus" NOT NULL DEFAULT 'DRAFT',
    "scoringMode" "ActivityScoringMode" NOT NULL,
    "reviewMode" "ActivityReviewMode" NOT NULL,
    "totalMarks" INTEGER,
    "masteryThreshold" INTEGER,
    "estimatedMinutes" INTEGER,
    "attemptsAllowed" INTEGER,
    "timeLimitSeconds" INTEGER,
    "shuffleItems" BOOLEAN NOT NULL DEFAULT false,
    "showImmediateFeedback" BOOLEAN NOT NULL DEFAULT false,
    "allowRetry" BOOLEAN NOT NULL DEFAULT true,
    "configuration" JSONB NOT NULL,
    "rewardConfiguration" JSONB,
    "presentationSettings" JSONB,
    "submittedForReviewAt" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "digital_activities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "digital_activity_curriculum_links" (
    "id" UUID NOT NULL,
    "digitalActivityId" UUID NOT NULL,
    "curriculumYearId" UUID,
    "languageStructureId" UUID,
    "remedialSkillId" UUID,
    "contentStandardId" UUID,
    "learningStandardId" UUID,
    "learningObjectiveId" UUID,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "digital_activity_curriculum_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "digital_activity_items" (
    "id" UUID NOT NULL,
    "digitalActivityId" UUID NOT NULL,
    "questionBankItemId" UUID NOT NULL,
    "sequence" INTEGER NOT NULL,
    "sectionKey" TEXT,
    "isRequired" BOOLEAN NOT NULL DEFAULT true,
    "marks" INTEGER,
    "configuration" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "digital_activity_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "digital_activity_media" (
    "id" UUID NOT NULL,
    "digitalActivityId" UUID NOT NULL,
    "mediaKey" TEXT NOT NULL,
    "mediaRole" TEXT NOT NULL,
    "mimeType" TEXT,
    "label" TEXT,
    "altText" TEXT,
    "sequence" INTEGER NOT NULL DEFAULT 1,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "digital_activity_media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "digital_activity_review_history" (
    "id" UUID NOT NULL,
    "digitalActivityId" UUID NOT NULL,
    "actorUserId" UUID NOT NULL,
    "fromStatus" "DigitalActivityStatus",
    "toStatus" "DigitalActivityStatus" NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "digital_activity_review_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "digital_activities_code_key" ON "digital_activities"("code");

-- CreateIndex
CREATE INDEX "digital_activities_programmeId_idx" ON "digital_activities"("programmeId");

-- CreateIndex
CREATE INDEX "digital_activities_activityTemplateId_idx" ON "digital_activities"("activityTemplateId");

-- CreateIndex
CREATE INDEX "digital_activities_createdByUserId_idx" ON "digital_activities"("createdByUserId");

-- CreateIndex
CREATE INDEX "digital_activities_difficulty_idx" ON "digital_activities"("difficulty");

-- CreateIndex
CREATE INDEX "digital_activities_status_idx" ON "digital_activities"("status");

-- CreateIndex
CREATE INDEX "digital_activities_createdAt_idx" ON "digital_activities"("createdAt");

-- CreateIndex
CREATE INDEX "digital_activity_curriculum_links_digitalActivityId_idx" ON "digital_activity_curriculum_links"("digitalActivityId");

-- CreateIndex
CREATE INDEX "digital_activity_curriculum_links_curriculumYearId_idx" ON "digital_activity_curriculum_links"("curriculumYearId");

-- CreateIndex
CREATE INDEX "digital_activity_curriculum_links_languageStructureId_idx" ON "digital_activity_curriculum_links"("languageStructureId");

-- CreateIndex
CREATE INDEX "digital_activity_curriculum_links_remedialSkillId_idx" ON "digital_activity_curriculum_links"("remedialSkillId");

-- CreateIndex
CREATE INDEX "digital_activity_curriculum_links_contentStandardId_idx" ON "digital_activity_curriculum_links"("contentStandardId");

-- CreateIndex
CREATE INDEX "digital_activity_curriculum_links_learningStandardId_idx" ON "digital_activity_curriculum_links"("learningStandardId");

-- CreateIndex
CREATE INDEX "digital_activity_curriculum_links_learningObjectiveId_idx" ON "digital_activity_curriculum_links"("learningObjectiveId");

-- CreateIndex
CREATE INDEX "digital_activity_items_questionBankItemId_idx" ON "digital_activity_items"("questionBankItemId");

-- CreateIndex
CREATE UNIQUE INDEX "digital_activity_items_digitalActivityId_sequence_key" ON "digital_activity_items"("digitalActivityId", "sequence");

-- CreateIndex
CREATE UNIQUE INDEX "digital_activity_items_digitalActivityId_questionBankItemId_key" ON "digital_activity_items"("digitalActivityId", "questionBankItemId");

-- CreateIndex
CREATE INDEX "digital_activity_media_mediaRole_idx" ON "digital_activity_media"("mediaRole");

-- CreateIndex
CREATE UNIQUE INDEX "digital_activity_media_digitalActivityId_mediaKey_key" ON "digital_activity_media"("digitalActivityId", "mediaKey");

-- CreateIndex
CREATE UNIQUE INDEX "digital_activity_media_digitalActivityId_mediaRole_sequence_key" ON "digital_activity_media"("digitalActivityId", "mediaRole", "sequence");

-- CreateIndex
CREATE INDEX "digital_activity_review_history_digitalActivityId_idx" ON "digital_activity_review_history"("digitalActivityId");

-- CreateIndex
CREATE INDEX "digital_activity_review_history_actorUserId_idx" ON "digital_activity_review_history"("actorUserId");

-- CreateIndex
CREATE INDEX "digital_activity_review_history_createdAt_idx" ON "digital_activity_review_history"("createdAt");

-- AddForeignKey
ALTER TABLE "digital_activities" ADD CONSTRAINT "digital_activities_programmeId_fkey" FOREIGN KEY ("programmeId") REFERENCES "curriculum_programmes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "digital_activities" ADD CONSTRAINT "digital_activities_activityTemplateId_fkey" FOREIGN KEY ("activityTemplateId") REFERENCES "activity_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "digital_activities" ADD CONSTRAINT "digital_activities_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "digital_activities" ADD CONSTRAINT "digital_activities_updatedByUserId_fkey" FOREIGN KEY ("updatedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "digital_activity_curriculum_links" ADD CONSTRAINT "digital_activity_curriculum_links_digitalActivityId_fkey" FOREIGN KEY ("digitalActivityId") REFERENCES "digital_activities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "digital_activity_curriculum_links" ADD CONSTRAINT "digital_activity_curriculum_links_curriculumYearId_fkey" FOREIGN KEY ("curriculumYearId") REFERENCES "curriculum_years"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "digital_activity_curriculum_links" ADD CONSTRAINT "digital_activity_curriculum_links_languageStructureId_fkey" FOREIGN KEY ("languageStructureId") REFERENCES "language_structures"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "digital_activity_curriculum_links" ADD CONSTRAINT "digital_activity_curriculum_links_remedialSkillId_fkey" FOREIGN KEY ("remedialSkillId") REFERENCES "remedial_skills"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "digital_activity_curriculum_links" ADD CONSTRAINT "digital_activity_curriculum_links_contentStandardId_fkey" FOREIGN KEY ("contentStandardId") REFERENCES "content_standards"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "digital_activity_curriculum_links" ADD CONSTRAINT "digital_activity_curriculum_links_learningStandardId_fkey" FOREIGN KEY ("learningStandardId") REFERENCES "learning_standards"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "digital_activity_curriculum_links" ADD CONSTRAINT "digital_activity_curriculum_links_learningObjectiveId_fkey" FOREIGN KEY ("learningObjectiveId") REFERENCES "learning_objectives"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "digital_activity_items" ADD CONSTRAINT "digital_activity_items_digitalActivityId_fkey" FOREIGN KEY ("digitalActivityId") REFERENCES "digital_activities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "digital_activity_items" ADD CONSTRAINT "digital_activity_items_questionBankItemId_fkey" FOREIGN KEY ("questionBankItemId") REFERENCES "question_bank_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "digital_activity_media" ADD CONSTRAINT "digital_activity_media_digitalActivityId_fkey" FOREIGN KEY ("digitalActivityId") REFERENCES "digital_activities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "digital_activity_review_history" ADD CONSTRAINT "digital_activity_review_history_digitalActivityId_fkey" FOREIGN KEY ("digitalActivityId") REFERENCES "digital_activities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "digital_activity_review_history" ADD CONSTRAINT "digital_activity_review_history_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
