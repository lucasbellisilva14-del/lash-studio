-- AlterTable
ALTER TABLE "MessageLog" ADD COLUMN     "sentByMemberId" TEXT;

-- AddForeignKey
ALTER TABLE "MessageLog" ADD CONSTRAINT "MessageLog_sentByMemberId_fkey" FOREIGN KEY ("sentByMemberId") REFERENCES "TeamMember"("id") ON DELETE SET NULL ON UPDATE CASCADE;

