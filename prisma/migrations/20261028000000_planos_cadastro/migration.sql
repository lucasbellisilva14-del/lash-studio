-- AlterTable
ALTER TABLE "Professional" ADD COLUMN     "plan" TEXT NOT NULL DEFAULT 'SOLO',
ADD COLUMN     "sellerCode" TEXT,
ADD COLUMN     "signupSource" TEXT NOT NULL DEFAULT 'ADMIN',
ADD COLUMN     "termsAcceptedAt" TIMESTAMP(3);


-- Contas que já têm equipe são Empresa
UPDATE "Professional" p SET "plan" = 'EMPRESA' WHERE EXISTS (SELECT 1 FROM "TeamMember" t WHERE t."professionalId" = p."id");
