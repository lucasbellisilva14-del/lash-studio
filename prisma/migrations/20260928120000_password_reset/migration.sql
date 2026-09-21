-- Redefinição de senha por e-mail: hash do token + validade
ALTER TABLE "Professional" ADD COLUMN "resetTokenHash" TEXT;
ALTER TABLE "Professional" ADD COLUMN "resetTokenExpiresAt" TIMESTAMP(3);

CREATE UNIQUE INDEX "Professional_resetTokenHash_key" ON "Professional"("resetTokenHash");
