ALTER TABLE "students"
ADD COLUMN "remedialSkillId" UUID;

CREATE INDEX "students_remedialSkillId_idx"
ON "students"("remedialSkillId");

ALTER TABLE "students"
ADD CONSTRAINT "students_remedialSkillId_fkey"
FOREIGN KEY ("remedialSkillId")
REFERENCES "remedial_skills"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;
