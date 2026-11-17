-- AlterTable
ALTER TABLE "Professional" ADD COLUMN     "referralCode" TEXT,
ADD COLUMN     "referredById" TEXT;

-- CreateTable
CREATE TABLE "ReferralCredit" (
    "id" TEXT NOT NULL,
    "referrerId" TEXT NOT NULL,
    "referredId" TEXT NOT NULL,
    "valueCents" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDENTE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "appliedAt" TIMESTAMP(3),

    CONSTRAINT "ReferralCredit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Professional_referralCode_key" ON "Professional"("referralCode");

-- CreateIndex
CREATE INDEX "Professional_referredById_idx" ON "Professional"("referredById");

-- CreateIndex
CREATE UNIQUE INDEX "ReferralCredit_referredId_key" ON "ReferralCredit"("referredId");

-- CreateIndex
CREATE INDEX "ReferralCredit_referrerId_idx" ON "ReferralCredit"("referrerId");

-- CreateIndex
CREATE INDEX "ReferralCredit_status_createdAt_idx" ON "ReferralCredit"("status", "createdAt");

-- AddForeignKey
ALTER TABLE "Professional" ADD CONSTRAINT "Professional_referredById_fkey" FOREIGN KEY ("referredById") REFERENCES "Professional"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReferralCredit" ADD CONSTRAINT "ReferralCredit_referrerId_fkey" FOREIGN KEY ("referrerId") REFERENCES "Professional"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReferralCredit" ADD CONSTRAINT "ReferralCredit_referredId_fkey" FOREIGN KEY ("referredId") REFERENCES "Professional"("id") ON DELETE CASCADE ON UPDATE CASCADE;
