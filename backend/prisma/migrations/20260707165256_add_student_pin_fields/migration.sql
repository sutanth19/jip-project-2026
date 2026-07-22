-- AlterTable
ALTER TABLE "students" ADD COLUMN     "isPinChanged" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "pinUpdatedAt" TIMESTAMP(3);
