import fs from "node:fs";
import { PrismaClient } from "@prisma/client";
const env = fs.readFileSync(new URL(".env", import.meta.url), "utf8");
process.env.DATABASE_URL = env.match(/^DATABASE_URL="?([^"\r\n]+)/m)[1];
const prisma = new PrismaClient();
const a = await prisma.appointment.findFirst({
  where: { client: { name: "Teste Mercado Pago" } },
  orderBy: { createdAt: "desc" },
  select: { id: true, status: true, depositCents: true, depositPaidAt: true, mpPaymentId: true, pixCopiaCola: true },
});
console.log(JSON.stringify(a, null, 2));
await prisma.$disconnect();
