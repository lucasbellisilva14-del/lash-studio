-- AlterTable
ALTER TABLE "Appointment" ADD COLUMN     "commissionPct" INTEGER,
ADD COLUMN     "memberId" TEXT;

-- AlterTable
ALTER TABLE "Client" ADD COLUMN     "createdByMemberId" TEXT;

-- AlterTable
ALTER TABLE "Professional" ADD COLUMN     "ownerBookable" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "ScheduleBlock" ADD COLUMN     "allTeam" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "memberId" TEXT;

-- CreateTable
CREATE TABLE "TeamMember" (
    "id" TEXT NOT NULL,
    "professionalId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT,
    "color" TEXT NOT NULL DEFAULT '#6f5fa8',
    "commissionPct" INTEGER NOT NULL DEFAULT 40,
    "bookableOnline" BOOLEAN NOT NULL DEFAULT true,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "inviteTokenHash" TEXT,
    "inviteExpiresAt" TIMESTAMP(3),
    "resetTokenHash" TEXT,
    "resetTokenExpiresAt" TIMESTAMP(3),
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeamMember_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TeamMember_email_key" ON "TeamMember"("email");

-- CreateIndex
CREATE UNIQUE INDEX "TeamMember_inviteTokenHash_key" ON "TeamMember"("inviteTokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "TeamMember_resetTokenHash_key" ON "TeamMember"("resetTokenHash");

-- CreateIndex
CREATE INDEX "TeamMember_professionalId_active_idx" ON "TeamMember"("professionalId", "active");

-- CreateIndex
CREATE INDEX "Appointment_professionalId_memberId_startAt_idx" ON "Appointment"("professionalId", "memberId", "startAt");

-- AddForeignKey
ALTER TABLE "Client" ADD CONSTRAINT "Client_createdByMemberId_fkey" FOREIGN KEY ("createdByMemberId") REFERENCES "TeamMember"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "TeamMember"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduleBlock" ADD CONSTRAINT "ScheduleBlock_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "TeamMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamMember" ADD CONSTRAINT "TeamMember_professionalId_fkey" FOREIGN KEY ("professionalId") REFERENCES "Professional"("id") ON DELETE CASCADE ON UPDATE CASCADE;

