-- Retorno ideal por serviço (lifting, brow, design)
ALTER TABLE "Service" ADD COLUMN "returnDays" INTEGER;
UPDATE "Service" SET "returnDays" = 45 WHERE "category" = 'LASH_LIFTING';
UPDATE "Service" SET "returnDays" = 30 WHERE "category" = 'BROW_LAMINATION';
UPDATE "Service" SET "returnDays" = 20 WHERE "category" = 'DESIGN_SOBRANCELHA';

-- Anamnese personalizável + retrato das perguntas no dia
ALTER TABLE "Professional" ADD COLUMN "anamnesisQuestionsJson" TEXT;
ALTER TABLE "AnamnesisForm" ADD COLUMN "questionsSnapshotJson" TEXT;

-- Falar com o suporte
CREATE TABLE "SupportMessage" (
    "id" TEXT NOT NULL,
    "professionalId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "pagePath" TEXT,
    "status" TEXT NOT NULL DEFAULT 'NOVA',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "SupportMessage_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "SupportMessage_status_createdAt_idx" ON "SupportMessage"("status", "createdAt");
ALTER TABLE "SupportMessage" ADD CONSTRAINT "SupportMessage_professionalId_fkey" FOREIGN KEY ("professionalId") REFERENCES "Professional"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Modelos de mensagem novos para todas as contas: Remarcar e Retorno
INSERT INTO "MessageTemplate" ("id", "professionalId", "kind", "name", "body", "active", "createdAt", "updatedAt")
SELECT 'tpl_rem_' || substr(md5(random()::text || p."id"), 1, 20), p."id", 'REMARCAR', 'Remarcar horário',
       E'Oi, {{nome}}! Senti sua falta no seu horário. Quer remarcar? Escolha o melhor dia por aqui: {{link_agendamento}}',
       true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "Professional" p
ON CONFLICT ("professionalId", "kind") DO NOTHING;

INSERT INTO "MessageTemplate" ("id", "professionalId", "kind", "name", "body", "active", "createdAt", "updatedAt")
SELECT 'tpl_ret_' || substr(md5(random()::text || p."id"), 1, 20), p."id", 'RETORNO', 'Hora do retorno',
       E'Oi, {{nome}}! Já está na hora de renovar seu {{servico}}. Quer garantir seu horário? {{link_agendamento}}',
       true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "Professional" p
ON CONFLICT ("professionalId", "kind") DO NOTHING;
