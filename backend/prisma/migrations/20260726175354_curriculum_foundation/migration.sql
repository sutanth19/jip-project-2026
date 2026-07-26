-- CreateEnum
CREATE TYPE "CurriculumStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "CurriculumDomain" AS ENUM ('LISTENING_SPEAKING', 'READING', 'WRITING', 'LANGUAGE_ARTS', 'GRAMMAR');

-- CreateEnum
CREATE TYPE "CurriculumRecordStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'ARCHIVED');

-- CreateTable
CREATE TABLE "curriculum_versions" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "sourceYear" INTEGER,
    "effectiveFrom" TIMESTAMP(3),
    "effectiveTo" TIMESTAMP(3),
    "status" "CurriculumStatus" NOT NULL DEFAULT 'DRAFT',
    "publishedAt" TIMESTAMP(3),
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "curriculum_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subjects" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "CurriculumRecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subjects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "curriculum_programmes" (
    "id" UUID NOT NULL,
    "curriculumVersionId" UUID NOT NULL,
    "subjectId" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "CurriculumRecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "curriculum_programmes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "curriculum_years" (
    "id" UUID NOT NULL,
    "programmeId" UUID NOT NULL,
    "yearLevel" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "status" "CurriculumRecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "curriculum_years_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "language_structures" (
    "id" UUID NOT NULL,
    "programmeId" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "sequence" INTEGER NOT NULL,
    "status" "CurriculumRecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "language_structures_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "remedial_skills" (
    "id" UUID NOT NULL,
    "programmeId" UUID NOT NULL,
    "languageStructureId" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isPreparatory" BOOLEAN NOT NULL DEFAULT false,
    "status" "CurriculumRecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "remedial_skills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content_standards" (
    "id" UUID NOT NULL,
    "programmeId" UUID NOT NULL,
    "curriculumYearId" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "domain" "CurriculumDomain" NOT NULL,
    "sequence" INTEGER,
    "status" "CurriculumRecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "content_standards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "learning_standards" (
    "id" UUID NOT NULL,
    "contentStandardId" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "sequence" INTEGER,
    "status" "CurriculumRecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "learning_standards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "remedial_skill_standard_mappings" (
    "id" UUID NOT NULL,
    "remedialSkillId" UUID NOT NULL,
    "learningStandardId" UUID NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "remedial_skill_standard_mappings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "learning_objectives" (
    "id" UUID NOT NULL,
    "remedialSkillId" UUID NOT NULL,
    "code" TEXT,
    "description" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "status" "CurriculumRecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "learning_objectives_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "suggested_teaching_activities" (
    "id" UUID NOT NULL,
    "remedialSkillId" UUID NOT NULL,
    "learningObjectiveId" UUID,
    "title" TEXT,
    "description" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "sourceReference" TEXT,
    "status" "CurriculumRecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "suggested_teaching_activities_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "curriculum_versions_code_key" ON "curriculum_versions"("code");

-- CreateIndex
CREATE INDEX "curriculum_versions_status_idx" ON "curriculum_versions"("status");

-- CreateIndex
CREATE INDEX "curriculum_versions_sourceYear_idx" ON "curriculum_versions"("sourceYear");

-- CreateIndex
CREATE UNIQUE INDEX "subjects_code_key" ON "subjects"("code");

-- CreateIndex
CREATE UNIQUE INDEX "subjects_name_key" ON "subjects"("name");

-- CreateIndex
CREATE INDEX "subjects_status_idx" ON "subjects"("status");

-- CreateIndex
CREATE INDEX "curriculum_programmes_subjectId_idx" ON "curriculum_programmes"("subjectId");

-- CreateIndex
CREATE INDEX "curriculum_programmes_status_idx" ON "curriculum_programmes"("status");

-- CreateIndex
CREATE UNIQUE INDEX "curriculum_programmes_curriculumVersionId_code_key" ON "curriculum_programmes"("curriculumVersionId", "code");

-- CreateIndex
CREATE INDEX "curriculum_years_status_idx" ON "curriculum_years"("status");

-- CreateIndex
CREATE UNIQUE INDEX "curriculum_years_programmeId_yearLevel_key" ON "curriculum_years"("programmeId", "yearLevel");

-- CreateIndex
CREATE UNIQUE INDEX "curriculum_years_programmeId_sequence_key" ON "curriculum_years"("programmeId", "sequence");

-- CreateIndex
CREATE INDEX "language_structures_status_idx" ON "language_structures"("status");

-- CreateIndex
CREATE UNIQUE INDEX "language_structures_programmeId_code_key" ON "language_structures"("programmeId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "language_structures_programmeId_sequence_key" ON "language_structures"("programmeId", "sequence");

-- CreateIndex
CREATE INDEX "remedial_skills_languageStructureId_idx" ON "remedial_skills"("languageStructureId");

-- CreateIndex
CREATE INDEX "remedial_skills_status_idx" ON "remedial_skills"("status");

-- CreateIndex
CREATE UNIQUE INDEX "remedial_skills_programmeId_code_key" ON "remedial_skills"("programmeId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "remedial_skills_programmeId_sequence_key" ON "remedial_skills"("programmeId", "sequence");

-- CreateIndex
CREATE INDEX "content_standards_domain_idx" ON "content_standards"("domain");

-- CreateIndex
CREATE INDEX "content_standards_status_idx" ON "content_standards"("status");

-- CreateIndex
CREATE UNIQUE INDEX "content_standards_programmeId_curriculumYearId_code_key" ON "content_standards"("programmeId", "curriculumYearId", "code");

-- CreateIndex
CREATE INDEX "learning_standards_status_idx" ON "learning_standards"("status");

-- CreateIndex
CREATE UNIQUE INDEX "learning_standards_contentStandardId_code_key" ON "learning_standards"("contentStandardId", "code");

-- CreateIndex
CREATE INDEX "remedial_skill_standard_mappings_learningStandardId_idx" ON "remedial_skill_standard_mappings"("learningStandardId");

-- CreateIndex
CREATE UNIQUE INDEX "remedial_skill_standard_mappings_remedialSkillId_learningSt_key" ON "remedial_skill_standard_mappings"("remedialSkillId", "learningStandardId");

-- CreateIndex
CREATE INDEX "learning_objectives_status_idx" ON "learning_objectives"("status");

-- CreateIndex
CREATE UNIQUE INDEX "learning_objectives_remedialSkillId_sequence_key" ON "learning_objectives"("remedialSkillId", "sequence");

-- CreateIndex
CREATE INDEX "suggested_teaching_activities_learningObjectiveId_idx" ON "suggested_teaching_activities"("learningObjectiveId");

-- CreateIndex
CREATE INDEX "suggested_teaching_activities_status_idx" ON "suggested_teaching_activities"("status");

-- CreateIndex
CREATE UNIQUE INDEX "suggested_teaching_activities_remedialSkillId_sequence_key" ON "suggested_teaching_activities"("remedialSkillId", "sequence");

-- AddForeignKey
ALTER TABLE "curriculum_programmes" ADD CONSTRAINT "curriculum_programmes_curriculumVersionId_fkey" FOREIGN KEY ("curriculumVersionId") REFERENCES "curriculum_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "curriculum_programmes" ADD CONSTRAINT "curriculum_programmes_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "subjects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "curriculum_years" ADD CONSTRAINT "curriculum_years_programmeId_fkey" FOREIGN KEY ("programmeId") REFERENCES "curriculum_programmes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "language_structures" ADD CONSTRAINT "language_structures_programmeId_fkey" FOREIGN KEY ("programmeId") REFERENCES "curriculum_programmes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "remedial_skills" ADD CONSTRAINT "remedial_skills_programmeId_fkey" FOREIGN KEY ("programmeId") REFERENCES "curriculum_programmes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "remedial_skills" ADD CONSTRAINT "remedial_skills_languageStructureId_fkey" FOREIGN KEY ("languageStructureId") REFERENCES "language_structures"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_standards" ADD CONSTRAINT "content_standards_programmeId_fkey" FOREIGN KEY ("programmeId") REFERENCES "curriculum_programmes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_standards" ADD CONSTRAINT "content_standards_curriculumYearId_fkey" FOREIGN KEY ("curriculumYearId") REFERENCES "curriculum_years"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "learning_standards" ADD CONSTRAINT "learning_standards_contentStandardId_fkey" FOREIGN KEY ("contentStandardId") REFERENCES "content_standards"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "remedial_skill_standard_mappings" ADD CONSTRAINT "remedial_skill_standard_mappings_remedialSkillId_fkey" FOREIGN KEY ("remedialSkillId") REFERENCES "remedial_skills"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "remedial_skill_standard_mappings" ADD CONSTRAINT "remedial_skill_standard_mappings_learningStandardId_fkey" FOREIGN KEY ("learningStandardId") REFERENCES "learning_standards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "learning_objectives" ADD CONSTRAINT "learning_objectives_remedialSkillId_fkey" FOREIGN KEY ("remedialSkillId") REFERENCES "remedial_skills"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "suggested_teaching_activities" ADD CONSTRAINT "suggested_teaching_activities_remedialSkillId_fkey" FOREIGN KEY ("remedialSkillId") REFERENCES "remedial_skills"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "suggested_teaching_activities" ADD CONSTRAINT "suggested_teaching_activities_learningObjectiveId_fkey" FOREIGN KEY ("learningObjectiveId") REFERENCES "learning_objectives"("id") ON DELETE SET NULL ON UPDATE CASCADE;
