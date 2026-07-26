-- CreateEnum
CREATE TYPE "TeacherPermission" AS ENUM ('CREATE_TEACHER');

-- DropForeignKey
ALTER TABLE "parents" DROP CONSTRAINT "parents_schoolId_fkey";

-- DropIndex
DROP INDEX "parents_schoolId_idx";

-- DropIndex
DROP INDEX "students_schoolId_idx";

-- DropIndex
DROP INDEX "students_studentId_idx";

-- DropIndex
DROP INDEX "students_studentId_key";

-- DropIndex
DROP INDEX "teachers_schoolId_idx";

-- DropIndex
DROP INDEX "teachers_teacherId_idx";

-- DropIndex
DROP INDEX "teachers_teacherId_key";

-- AlterTable
ALTER TABLE "admins" DROP COLUMN "accountStatus";

-- AlterTable
ALTER TABLE "parents" DROP COLUMN "accountStatus",
DROP COLUMN "schoolId";

-- AlterTable
ALTER TABLE "students" DROP COLUMN "accountStatus";

-- AlterTable
ALTER TABLE "teachers" DROP COLUMN "accountStatus";

-- CreateTable
CREATE TABLE "teacher_permission_grants" (
    "id" UUID NOT NULL,
    "teacherId" UUID NOT NULL,
    "grantedById" UUID NOT NULL,
    "permission" "TeacherPermission" NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "maxUses" INTEGER NOT NULL DEFAULT 1,
    "usedCount" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "teacher_permission_grants_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "teacher_permission_grants_teacherId_idx" ON "teacher_permission_grants"("teacherId");

-- CreateIndex
CREATE INDEX "teacher_permission_grants_grantedById_idx" ON "teacher_permission_grants"("grantedById");

-- CreateIndex
CREATE INDEX "teacher_permission_grants_permission_isActive_idx" ON "teacher_permission_grants"("permission", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "students_schoolId_studentId_key" ON "students"("schoolId", "studentId");

-- CreateIndex
CREATE UNIQUE INDEX "teachers_schoolId_teacherId_key" ON "teachers"("schoolId", "teacherId");

-- AddForeignKey
ALTER TABLE "teacher_permission_grants" ADD CONSTRAINT "teacher_permission_grants_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "teachers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teacher_permission_grants" ADD CONSTRAINT "teacher_permission_grants_grantedById_fkey" FOREIGN KEY ("grantedById") REFERENCES "admins"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
