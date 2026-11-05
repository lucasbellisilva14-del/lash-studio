-- AlterTable
ALTER TABLE "MessageLog" ADD COLUMN     "auto" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "WhatsAppConnection" (
    "id" TEXT NOT NULL,
    "professionalId" TEXT NOT NULL,
    "instanceName" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DESCONECTADO',
    "phone" TEXT,
    "profileName" TEXT,
    "connectedAt" TIMESTAMP(3),
    "autoSend" BOOLEAN NOT NULL DEFAULT true,
    "autoKinds" TEXT NOT NULL DEFAULT 'CONFIRMACAO,LEMBRETE_24H,POS_APLICACAO,MANUTENCAO,RETORNO,REMARCAR',
    "dailyLimit" INTEGER NOT NULL DEFAULT 60,
    "nextSendAt" TIMESTAMP(3),
    "lastSentAt" TIMESTAMP(3),
    "sentDay" TEXT,
    "sentToday" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "closedSince" TIMESTAMP(3),
    "dropNotifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WhatsAppConnection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WhatsAppConnection_professionalId_key" ON "WhatsAppConnection"("professionalId");

-- CreateIndex
CREATE UNIQUE INDEX "WhatsAppConnection_instanceName_key" ON "WhatsAppConnection"("instanceName");

-- AddForeignKey
ALTER TABLE "WhatsAppConnection" ADD CONSTRAINT "WhatsAppConnection_professionalId_fkey" FOREIGN KEY ("professionalId") REFERENCES "Professional"("id") ON DELETE CASCADE ON UPDATE CASCADE;

