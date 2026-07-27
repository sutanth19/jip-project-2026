-- CreateEnum
CREATE TYPE "QuestionBankItemType" AS ENUM ('LETTER', 'SYLLABLE', 'WORD', 'PHRASE', 'SENTENCE', 'PASSAGE', 'QUESTION');

-- CreateEnum
CREATE TYPE "QuestionBankStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "DifficultyLevel" AS ENUM ('BEGINNER', 'EASY', 'MEDIUM', 'HARD');

-- CreateEnum
CREATE TYPE "QuestionAnswerType" AS ENUM ('NONE', 'SINGLE_CHOICE', 'MULTIPLE_CHOICE', 'TEXT', 'BOOLEAN', 'ORDERED_ITEMS', 'MATCHING_PAIRS');

-- CreateEnum
CREATE TYPE "MediaRole" AS ENUM ('PRIMARY_IMAGE', 'SUPPORTING_IMAGE', 'REFERENCE_AUDIO', 'INSTRUCTION_AUDIO', 'REFERENCE_VIDEO');

-- CreateEnum
CREATE TYPE "ActivityTemplateStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ActivityTemplateCategory" AS ENUM ('QUIZ', 'MATCHING', 'ARRANGEMENT', 'WRITING', 'READING', 'LISTENING', 'SPEAKING');

-- CreateEnum
CREATE TYPE "AssessmentMode" AS ENUM ('AUTO', 'MANUAL', 'HYBRID', 'AI_ASSISTED');

-- CreateTable
CREATE TABLE "question_bank_items" (
    "id" UUID NOT NULL,
    "programmeId" UUID NOT NULL,
    "createdByUserId" UUID NOT NULL,
    "type" "QuestionBankItemType" NOT NULL,
    "title" TEXT,
    "content" TEXT NOT NULL,
    "normalizedText" TEXT,
    "languagePattern" TEXT,
    "instructions" TEXT,
    "explanation" TEXT,
    "answerType" "QuestionAnswerType" NOT NULL DEFAULT 'NONE',
    "correctAnswer" JSONB,
    "difficulty" "DifficultyLevel" NOT NULL,
    "status" "QuestionBankStatus" NOT NULL DEFAULT 'DRAFT',
    "sourceReference" TEXT,
    "metadata" JSONB,
    "publishedAt" TIMESTAMP(3),
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "question_bank_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "question_bank_curriculum_links" (
    "id" UUID NOT NULL,
    "questionBankItemId" UUID NOT NULL,
    "remedialSkillId" UUID,
    "contentStandardId" UUID,
    "learningStandardId" UUID,
    "curriculumYearId" UUID,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "question_bank_curriculum_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "question_bank_answer_options" (
    "id" UUID NOT NULL,
    "questionBankItemId" UUID NOT NULL,
    "label" TEXT,
    "content" TEXT NOT NULL,
    "isCorrect" BOOLEAN NOT NULL DEFAULT false,
    "sequence" INTEGER NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "question_bank_answer_options_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "question_bank_media" (
    "id" UUID NOT NULL,
    "questionBankItemId" UUID NOT NULL,
    "mediaKey" TEXT NOT NULL,
    "mediaRole" "MediaRole" NOT NULL,
    "mimeType" TEXT,
    "originalName" TEXT,
    "sequence" INTEGER NOT NULL DEFAULT 0,
    "altText" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "question_bank_media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activity_templates" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" "ActivityTemplateCategory" NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" "ActivityTemplateStatus" NOT NULL DEFAULT 'ACTIVE',
    "assessmentMode" "AssessmentMode" NOT NULL,
    "requiresTeacherReview" BOOLEAN NOT NULL DEFAULT false,
    "supportsAutoMarking" BOOLEAN NOT NULL DEFAULT false,
    "supportsMedia" BOOLEAN NOT NULL DEFAULT false,
    "supportsAudio" BOOLEAN NOT NULL DEFAULT false,
    "supportsVideo" BOOLEAN NOT NULL DEFAULT false,
    "supportsDrawing" BOOLEAN NOT NULL DEFAULT false,
    "supportsVoiceRecording" BOOLEAN NOT NULL DEFAULT false,
    "supportsFutureAI" BOOLEAN NOT NULL DEFAULT false,
    "configurationSchema" JSONB NOT NULL,
    "contentSchema" JSONB NOT NULL,
    "rendererKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "activity_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activity_template_item_types" (
    "id" UUID NOT NULL,
    "activityTemplateId" UUID NOT NULL,
    "itemType" "QuestionBankItemType" NOT NULL,
    "isRequired" BOOLEAN NOT NULL DEFAULT false,
    "minimumItems" INTEGER,
    "maximumItems" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_template_item_types_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "question_bank_items_programmeId_idx" ON "question_bank_items"("programmeId");

-- CreateIndex
CREATE INDEX "question_bank_items_createdByUserId_idx" ON "question_bank_items"("createdByUserId");

-- CreateIndex
CREATE INDEX "question_bank_items_type_idx" ON "question_bank_items"("type");

-- CreateIndex
CREATE INDEX "question_bank_items_difficulty_idx" ON "question_bank_items"("difficulty");

-- CreateIndex
CREATE INDEX "question_bank_items_status_idx" ON "question_bank_items"("status");

-- CreateIndex
CREATE INDEX "question_bank_items_normalizedText_idx" ON "question_bank_items"("normalizedText");

-- CreateIndex
CREATE INDEX "question_bank_items_createdAt_idx" ON "question_bank_items"("createdAt");

-- CreateIndex
CREATE INDEX "question_bank_curriculum_links_questionBankItemId_idx" ON "question_bank_curriculum_links"("questionBankItemId");

-- CreateIndex
CREATE INDEX "question_bank_curriculum_links_remedialSkillId_idx" ON "question_bank_curriculum_links"("remedialSkillId");

-- CreateIndex
CREATE INDEX "question_bank_curriculum_links_contentStandardId_idx" ON "question_bank_curriculum_links"("contentStandardId");

-- CreateIndex
CREATE INDEX "question_bank_curriculum_links_learningStandardId_idx" ON "question_bank_curriculum_links"("learningStandardId");

-- CreateIndex
CREATE INDEX "question_bank_curriculum_links_curriculumYearId_idx" ON "question_bank_curriculum_links"("curriculumYearId");

-- CreateIndex
CREATE INDEX "question_bank_answer_options_questionBankItemId_idx" ON "question_bank_answer_options"("questionBankItemId");

-- CreateIndex
CREATE UNIQUE INDEX "question_bank_answer_options_questionBankItemId_sequence_key" ON "question_bank_answer_options"("questionBankItemId", "sequence");

-- CreateIndex
CREATE INDEX "question_bank_media_questionBankItemId_idx" ON "question_bank_media"("questionBankItemId");

-- CreateIndex
CREATE INDEX "question_bank_media_mediaRole_idx" ON "question_bank_media"("mediaRole");

-- CreateIndex
CREATE UNIQUE INDEX "question_bank_media_questionBankItemId_mediaRole_sequence_key" ON "question_bank_media"("questionBankItemId", "mediaRole", "sequence");

-- CreateIndex
CREATE UNIQUE INDEX "activity_templates_code_key" ON "activity_templates"("code");

-- CreateIndex
CREATE INDEX "activity_templates_category_idx" ON "activity_templates"("category");

-- CreateIndex
CREATE INDEX "activity_templates_status_idx" ON "activity_templates"("status");

-- CreateIndex
CREATE INDEX "activity_templates_rendererKey_idx" ON "activity_templates"("rendererKey");

-- CreateIndex
CREATE INDEX "activity_template_item_types_activityTemplateId_idx" ON "activity_template_item_types"("activityTemplateId");

-- CreateIndex
CREATE UNIQUE INDEX "activity_template_item_types_activityTemplateId_itemType_key" ON "activity_template_item_types"("activityTemplateId", "itemType");

-- AddForeignKey
ALTER TABLE "question_bank_items" ADD CONSTRAINT "question_bank_items_programmeId_fkey" FOREIGN KEY ("programmeId") REFERENCES "curriculum_programmes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_bank_items" ADD CONSTRAINT "question_bank_items_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_bank_curriculum_links" ADD CONSTRAINT "question_bank_curriculum_links_questionBankItemId_fkey" FOREIGN KEY ("questionBankItemId") REFERENCES "question_bank_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_bank_curriculum_links" ADD CONSTRAINT "question_bank_curriculum_links_remedialSkillId_fkey" FOREIGN KEY ("remedialSkillId") REFERENCES "remedial_skills"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_bank_curriculum_links" ADD CONSTRAINT "question_bank_curriculum_links_contentStandardId_fkey" FOREIGN KEY ("contentStandardId") REFERENCES "content_standards"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_bank_curriculum_links" ADD CONSTRAINT "question_bank_curriculum_links_learningStandardId_fkey" FOREIGN KEY ("learningStandardId") REFERENCES "learning_standards"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_bank_curriculum_links" ADD CONSTRAINT "question_bank_curriculum_links_curriculumYearId_fkey" FOREIGN KEY ("curriculumYearId") REFERENCES "curriculum_years"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_bank_answer_options" ADD CONSTRAINT "question_bank_answer_options_questionBankItemId_fkey" FOREIGN KEY ("questionBankItemId") REFERENCES "question_bank_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_bank_media" ADD CONSTRAINT "question_bank_media_questionBankItemId_fkey" FOREIGN KEY ("questionBankItemId") REFERENCES "question_bank_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_template_item_types" ADD CONSTRAINT "activity_template_item_types_activityTemplateId_fkey" FOREIGN KEY ("activityTemplateId") REFERENCES "activity_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;
