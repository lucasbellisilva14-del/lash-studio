-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Professional" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "studioName" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "logoUrl" TEXT,
    "accentColor" TEXT NOT NULL DEFAULT '#A85566',
    "addressLine" TEXT,
    "mapsUrl" TEXT,
    "whatsapp" TEXT,
    "instagram" TEXT,
    "pixKey" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'America/Sao_Paulo',
    "bufferMinutes" INTEGER NOT NULL DEFAULT 15,
    "minAdvanceHours" INTEGER NOT NULL DEFAULT 2,
    "depositType" TEXT NOT NULL DEFAULT 'PERCENT',
    "depositValue" INTEGER NOT NULL DEFAULT 30,
    "cancellationWindowHours" INTEGER NOT NULL DEFAULT 24,
    "maintenanceLimitDays" INTEGER NOT NULL DEFAULT 21,
    "maintenanceNoticeDay" INTEGER NOT NULL DEFAULT 15,
    "noShowThreshold" INTEGER NOT NULL DEFAULT 2,
    "riskWindowDays" INTEGER NOT NULL DEFAULT 30,
    "inactiveDays" INTEGER NOT NULL DEFAULT 60,
    "dailySummaryTime" TEXT NOT NULL DEFAULT '07:30',
    "consentText" TEXT,
    "onboardingDone" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Professional" ("accentColor", "addressLine", "bufferMinutes", "cancellationWindowHours", "consentText", "createdAt", "dailySummaryTime", "depositType", "depositValue", "email", "id", "inactiveDays", "instagram", "logoUrl", "maintenanceLimitDays", "maintenanceNoticeDay", "mapsUrl", "minAdvanceHours", "name", "noShowThreshold", "onboardingDone", "passwordHash", "pixKey", "riskWindowDays", "slug", "studioName", "timezone", "updatedAt", "whatsapp") SELECT "accentColor", "addressLine", "bufferMinutes", "cancellationWindowHours", "consentText", "createdAt", "dailySummaryTime", "depositType", "depositValue", "email", "id", "inactiveDays", "instagram", "logoUrl", "maintenanceLimitDays", "maintenanceNoticeDay", "mapsUrl", "minAdvanceHours", "name", "noShowThreshold", "onboardingDone", "passwordHash", "pixKey", "riskWindowDays", "slug", "studioName", "timezone", "updatedAt", "whatsapp" FROM "Professional";
DROP TABLE "Professional";
ALTER TABLE "new_Professional" RENAME TO "Professional";
CREATE UNIQUE INDEX "Professional_email_key" ON "Professional"("email");
CREATE UNIQUE INDEX "Professional_slug_key" ON "Professional"("slug");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
