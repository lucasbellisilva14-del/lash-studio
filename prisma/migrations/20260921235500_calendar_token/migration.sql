-- Token secreto do feed .ics por profissional (nulo = feed desligado)
ALTER TABLE "Professional" ADD COLUMN "calendarToken" TEXT;

CREATE UNIQUE INDEX "Professional_calendarToken_key" ON "Professional"("calendarToken");
