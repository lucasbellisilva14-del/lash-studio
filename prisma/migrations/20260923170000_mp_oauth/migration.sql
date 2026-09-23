-- Mercado Pago via OAuth: tokens por profissional (criptografados)
ALTER TABLE "Professional" ADD COLUMN "mpUserId" TEXT;
ALTER TABLE "Professional" ADD COLUMN "mpAccessToken" TEXT;
ALTER TABLE "Professional" ADD COLUMN "mpRefreshToken" TEXT;
ALTER TABLE "Professional" ADD COLUMN "mpTokenExpiresAt" TIMESTAMP(3);
ALTER TABLE "Professional" ADD COLUMN "mpConnectedAt" TIMESTAMP(3);
