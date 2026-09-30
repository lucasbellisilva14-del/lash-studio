-- Assinatura do LashOS: status/validade/preço por profissional + preapproval MP
ALTER TABLE "Professional" ADD COLUMN "subscriptionStatus" TEXT NOT NULL DEFAULT 'CORTESIA';
ALTER TABLE "Professional" ADD COLUMN "subscriptionPaidUntil" TIMESTAMP(3);
ALTER TABLE "Professional" ADD COLUMN "trialEndsAt" TIMESTAMP(3);
ALTER TABLE "Professional" ADD COLUMN "planPriceCents" INTEGER NOT NULL DEFAULT 9900;
ALTER TABLE "Professional" ADD COLUMN "mpPreapprovalId" TEXT;

CREATE UNIQUE INDEX "Professional_mpPreapprovalId_key" ON "Professional"("mpPreapprovalId");
