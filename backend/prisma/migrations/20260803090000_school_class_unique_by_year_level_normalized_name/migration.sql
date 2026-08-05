ALTER TABLE "school_classes"
ADD COLUMN "normalizedClassName" TEXT;

UPDATE "school_classes"
SET "normalizedClassName" = LOWER(BTRIM("className"));

ALTER TABLE "school_classes"
ALTER COLUMN "normalizedClassName" SET NOT NULL;

DROP INDEX "school_classes_schoolId_className_academicYear_key";

CREATE UNIQUE INDEX "school_classes_schoolId_academicYear_yearLevel_normalizedClassName_key"
ON "school_classes"("schoolId", "academicYear", "yearLevel", "normalizedClassName");
