/*
  Warnings:

  - You are about to drop the column `mustChangePassword` on the `users` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[setupToken]` on the table `users` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "users" DROP COLUMN "mustChangePassword",
ADD COLUMN     "setupToken" TEXT,
ADD COLUMN     "setupTokenExpiry" TIMESTAMP(3),
ALTER COLUMN "accountStatus" SET DEFAULT 'PENDING';

-- CreateIndex
CREATE UNIQUE INDEX "users_setupToken_key" ON "users"("setupToken");
