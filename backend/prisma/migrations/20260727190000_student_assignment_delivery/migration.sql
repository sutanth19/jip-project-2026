CREATE TYPE "AssignmentStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'ACTIVE', 'CLOSED', 'CANCELLED', 'ARCHIVED');
CREATE TYPE "AssignmentTargetType" AS ENUM ('CLASS', 'STUDENT');
CREATE TYPE "AssignmentPriority" AS ENUM ('NORMAL', 'HIGH');

CREATE TABLE "assignments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "title" TEXT NOT NULL,
    "instructions" TEXT,
    "digitalActivityId" UUID NOT NULL,
    "schoolId" UUID NOT NULL,
    "assignedByTeacherId" UUID NOT NULL,
    "status" "AssignmentStatus" NOT NULL DEFAULT 'DRAFT',
    "priority" "AssignmentPriority" NOT NULL DEFAULT 'NORMAL',
    "startAt" TIMESTAMP(3),
    "dueAt" TIMESTAMP(3),
    "availableUntil" TIMESTAMP(3),
    "isRequired" BOOLEAN NOT NULL DEFAULT true,
    "attemptsAllowed" INTEGER,
    "showResultsAfterCompletion" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "assignments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "assignment_class_targets" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "assignmentId" UUID NOT NULL,
    "classId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "assignment_class_targets_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "assignment_student_targets" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "assignmentId" UUID NOT NULL,
    "studentId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "assignment_student_targets_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "assignments_digitalActivityId_key" ON "assignments"("digitalActivityId");
CREATE INDEX "assignments_schoolId_idx" ON "assignments"("schoolId");
CREATE INDEX "assignments_assignedByTeacherId_idx" ON "assignments"("assignedByTeacherId");
CREATE INDEX "assignments_status_idx" ON "assignments"("status");
CREATE INDEX "assignments_startAt_idx" ON "assignments"("startAt");
CREATE INDEX "assignments_dueAt_idx" ON "assignments"("dueAt");
CREATE INDEX "assignments_schoolId_status_idx" ON "assignments"("schoolId", "status");
CREATE INDEX "assignments_assignedByTeacherId_createdAt_idx" ON "assignments"("assignedByTeacherId", "createdAt");
CREATE UNIQUE INDEX "assignment_class_targets_assignmentId_classId_key" ON "assignment_class_targets"("assignmentId", "classId");
CREATE INDEX "assignment_class_targets_classId_idx" ON "assignment_class_targets"("classId");
CREATE UNIQUE INDEX "assignment_student_targets_assignmentId_studentId_key" ON "assignment_student_targets"("assignmentId", "studentId");
CREATE INDEX "assignment_student_targets_studentId_idx" ON "assignment_student_targets"("studentId");

ALTER TABLE "assignments" ADD CONSTRAINT "assignments_digitalActivityId_fkey" FOREIGN KEY ("digitalActivityId") REFERENCES "digital_activities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_assignedByTeacherId_fkey" FOREIGN KEY ("assignedByTeacherId") REFERENCES "teachers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "assignment_class_targets" ADD CONSTRAINT "assignment_class_targets_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "assignments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "assignment_class_targets" ADD CONSTRAINT "assignment_class_targets_classId_fkey" FOREIGN KEY ("classId") REFERENCES "school_classes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "assignment_student_targets" ADD CONSTRAINT "assignment_student_targets_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "assignments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "assignment_student_targets" ADD CONSTRAINT "assignment_student_targets_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
