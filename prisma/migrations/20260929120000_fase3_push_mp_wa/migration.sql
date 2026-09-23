-- Fase 3: push por horário individual, Mercado Pago e WhatsApp automático
ALTER TABLE "Professional" ADD COLUMN "dailySummarySentDay" TEXT;
ALTER TABLE "Professional" ADD COLUMN "autoSendMessages" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Professional" ADD COLUMN "autoSendSentDay" TEXT;

ALTER TABLE "Appointment" ADD COLUMN "mpPaymentId" TEXT;
ALTER TABLE "Appointment" ADD COLUMN "pixCopiaCola" TEXT;

CREATE UNIQUE INDEX "Appointment_mpPaymentId_key" ON "Appointment"("mpPaymentId");
