-- Vitrine do link público: fotos escolhidas pela profissional
ALTER TABLE "Photo" ADD COLUMN "showcaseAt" TIMESTAMP(3);

CREATE INDEX "Photo_professionalId_showcaseAt_idx" ON "Photo"("professionalId", "showcaseAt");
