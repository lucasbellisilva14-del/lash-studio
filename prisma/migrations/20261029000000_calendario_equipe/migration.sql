-- AlterTable
ALTER TABLE "TeamMember" ADD COLUMN     "calendarToken" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "TeamMember_calendarToken_key" ON "TeamMember"("calendarToken");

