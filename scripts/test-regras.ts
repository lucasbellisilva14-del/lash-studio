/**
 * Testes das regras de negócio críticas da Fase 1.
 * Rodar: npx tsx scripts/test-regras.ts   (usa o banco do seed para a fila)
 */
import { validateSlot, freeSlotsForDay } from "@/lib/domain/scheduling";
import { checkMaintenanceWindow } from "@/lib/domain/maintenance";
import { computeDeposit } from "@/lib/domain/deposit";
import { computeClientCycle } from "@/lib/domain/client-status";
import { renderTemplate } from "@/lib/domain/templates";
import { buildMessageQueue } from "@/lib/domain/queue";
import { isValidPhone, normalizePhone, waLink } from "@/lib/phone";
import { formatBRL, parseBRL, applyFee } from "@/lib/money";
import { localToUtc } from "@/lib/dates";
import { prisma } from "@/lib/prisma";

let passed = 0;
let failed = 0;

function check(name: string, condition: boolean, extra?: unknown) {
  if (condition) {
    passed++;
    console.log(`  ✅ ${name}`);
  } else {
    failed++;
    console.error(`  ❌ ${name}`, extra ?? "");
  }
}

const TZ = "America/Sao_Paulo";
const workingHours = [
  { weekday: 2, startTime: "09:00", endTime: "18:00", active: true }, // terça
];
// terça-feira fixa p/ testes determinísticos: 2026-09-01 é uma terça
const DAY = "2026-09-01";
const base = {
  bufferMinutes: 15,
  minAdvanceHours: 2,
  timezone: TZ,
  workingHours,
  blocks: [],
  appointments: [
    {
      id: "a1",
      startAt: localToUtc(DAY, "10:00", TZ),
      endAt: localToUtc(DAY, "12:00", TZ),
      clientName: "Juliana",
    },
  ],
  now: localToUtc(DAY, "07:00", TZ),
};

console.log("\n── Regra 2: conflito de horário e buffer ──");
{
  const conflito = validateSlot({ ...base, startAt: localToUtc(DAY, "11:00", TZ), durationMin: 60 });
  check("conflito direto é bloqueado", conflito.some((v) => v.code === "CONFLITO"), conflito);

  const buffer = validateSlot({ ...base, startAt: localToUtc(DAY, "12:10", TZ), durationMin: 60 });
  check("violação de buffer (10 min < 15) é bloqueada", buffer.some((v) => v.code === "BUFFER"), buffer);

  const ok = validateSlot({ ...base, startAt: localToUtc(DAY, "12:15", TZ), durationMin: 60 });
  check("início exatamente após o buffer passa", ok.length === 0, ok);

  const fora = validateSlot({ ...base, startAt: localToUtc(DAY, "17:30", TZ), durationMin: 60 });
  check("estourar o fim do expediente é bloqueado", fora.some((v) => v.code === "FORA_DO_HORARIO"), fora);

  const domingo = validateSlot({ ...base, startAt: localToUtc("2026-09-06", "10:00", TZ), durationMin: 60 });
  check("dia sem atendimento é bloqueado", domingo.some((v) => v.code === "FORA_DO_HORARIO"), domingo);

  const cedo = validateSlot({ ...base, startAt: localToUtc(DAY, "08:00", TZ), durationMin: 60 });
  check("antecedência mínima é sinalizada", cedo.some((v) => v.code === "ANTECEDENCIA"), cedo);

  const reagenda = validateSlot({
    ...base,
    startAt: localToUtc(DAY, "10:30", TZ),
    durationMin: 60,
    ignoreAppointmentId: "a1",
  });
  check("reagendamento ignora o próprio agendamento", reagenda.length === 0, reagenda);

  const bloqueio = validateSlot({
    ...base,
    startAt: localToUtc(DAY, "13:00", TZ),
    durationMin: 60,
    blocks: [{ title: "Almoço", type: "SEMANAL", weekday: 2, startTime: "12:30", endTime: "13:30", startAt: null, endAt: null }],
  });
  check("bloqueio semanal é respeitado", bloqueio.some((v) => v.code === "BLOQUEIO"), bloqueio);

  const slots = freeSlotsForDay({
    dayKey: DAY, durationMin: 60, bufferMinutes: 15, minAdvanceHours: 2,
    timezone: TZ, workingHours, blocks: [], appointments: base.appointments, now: base.now,
  });
  check(
    "horários livres não colidem com o atendimento 10h-12h (+buffer)",
    slots.length > 0 && !slots.includes("09:30") && !slots.includes("11:00") && !slots.includes("12:00") && slots.includes("12:30"),
    slots,
  );
}

console.log("\n── Regra 1: manutenção fora do prazo vira aplicação ──");
{
  const dentro = checkMaintenanceWindow({
    lastLashAt: localToUtc("2026-08-15", "10:00", TZ),
    limitDays: 21,
    targetDate: localToUtc("2026-09-01", "10:00", TZ), // 17 dias
    suggestedServiceId: "apl1",
  });
  check("17 dias após aplicação: manutenção ok", dentro.ok === true, dentro);

  const fora = checkMaintenanceWindow({
    lastLashAt: localToUtc("2026-08-01", "10:00", TZ),
    limitDays: 21,
    targetDate: localToUtc("2026-09-01", "10:00", TZ), // 31 dias
    suggestedServiceId: "apl1",
  });
  check(
    "31 dias: avisa e sugere aplicação",
    !fora.ok && fora.reason === "FORA_DO_PRAZO" && fora.suggestedServiceId === "apl1",
    fora,
  );

  const semApl = checkMaintenanceWindow({
    lastLashAt: null, limitDays: 21,
    targetDate: localToUtc("2026-09-01", "10:00", TZ), suggestedServiceId: "apl1",
  });
  check("sem aplicação registrada: bloqueia manutenção", !semApl.ok && semApl.reason === "SEM_APLICACAO", semApl);

  const limite = checkMaintenanceWindow({
    lastLashAt: localToUtc("2026-08-11", "10:00", TZ), limitDays: 21,
    targetDate: localToUtc("2026-09-01", "10:00", TZ), // exatamente 21 dias
    suggestedServiceId: null,
  });
  check("exatamente no dia 21: ainda é manutenção", limite.ok === true, limite);
}

console.log("\n── Regra 5: N no-shows passa a exigir sinal ──");
{
  const policy = { depositType: "PERCENT", depositValue: 30, noShowThreshold: 2 };
  const semSinal = computeDeposit({ policy, serviceRequiresDeposit: false, clientNoShowCount: 1, priceCents: 18000 });
  check("1 falta + serviço sem sinal: não exige", semSinal.required === false, semSinal);

  const porFalta = computeDeposit({ policy, serviceRequiresDeposit: false, clientNoShowCount: 2, priceCents: 18000 });
  check(
    "2 faltas: exige sinal de 30% (R$ 54,00) com motivo NO_SHOW",
    porFalta.required && porFalta.depositCents === 5400 && porFalta.reason === "NO_SHOW",
    porFalta,
  );

  const porServico = computeDeposit({ policy, serviceRequiresDeposit: true, clientNoShowCount: 0, priceCents: 16000 });
  check("serviço exige: sinal de R$ 48,00", porServico.required && porServico.depositCents === 4800, porServico);

  const fixo = computeDeposit({
    policy: { depositType: "FIXED", depositValue: 5000, noShowThreshold: 2 },
    serviceRequiresDeposit: true, clientNoShowCount: 0, priceCents: 16000,
  });
  check("sinal fixo R$ 50,00", fixo.depositCents === 5000, fixo);

  const none = computeDeposit({
    policy: { depositType: "NONE", depositValue: 0, noShowThreshold: 2 },
    serviceRequiresDeposit: true, clientNoShowCount: 5, priceCents: 16000,
  });
  check("política NONE nunca exige", none.required === false, none);
}

console.log("\n── Status automático da cliente ──");
{
  const settings = { maintenanceLimitDays: 21, inactiveDays: 60 };
  const now = localToUtc("2026-09-01", "12:00", TZ);
  const d = (days: number) => new Date(now.getTime() - days * 86400000);

  check("14 dias: ATIVA", computeClientCycle(d(14), settings, now).status === "ATIVA");
  check("21 dias: ATIVA (no limite)", computeClientCycle(d(21), settings, now).status === "ATIVA");
  check("22 dias: EM_RISCO", computeClientCycle(d(22), settings, now).status === "EM_RISCO");
  check("60 dias: EM_RISCO (no limite)", computeClientCycle(d(60), settings, now).status === "EM_RISCO");
  check("61 dias: INATIVA", computeClientCycle(d(61), settings, now).status === "INATIVA");
  check("sem histórico: SEM_HISTORICO", computeClientCycle(null, settings, now).status === "SEM_HISTORICO");
}

console.log("\n── Templates, telefone e dinheiro ──");
{
  const rendered = renderTemplate(
    "Oi, {{nome}}! {{servico}} em {{data}} às {{hora}} — {{valor}} (sinal {{valor_sinal}}). Pix: {{pix}} — {{nome_estudio}}",
    {
      clientName: "juliana souza",
      startAt: localToUtc("2026-09-01", "14:30", TZ),
      serviceName: "Volume brasileiro",
      priceCents: 18000,
      depositCents: 5400,
      pixKey: "48991234567",
      studioName: "Studio Marina Lash",
      timezone: TZ,
    },
  );
  const normalized = rendered.replace(/ /g, " "); // NBSP do Intl → espaço comum
  check(
    "todas as variáveis renderizam em pt-BR",
    normalized.includes("Juliana") &&
      normalized.includes("01/09/2026") &&
      normalized.includes("14:30") &&
      normalized.includes("R$ 180,00") &&
      normalized.includes("R$ 54,00") &&
      normalized.includes("Studio Marina Lash"),
    rendered,
  );

  check("telefone válido com DDD", isValidPhone("(48) 99911-0001"));
  check("telefone inválido (curto)", !isValidPhone("999110001"));
  check("normaliza +55", normalizePhone("+55 48 99911-0001") === "48999110001");
  const link = waLink("48999110001", "Olá, tudo bem?");
  check(
    "wa.me com texto URL-encoded",
    link.startsWith("https://wa.me/5548999110001?text=") && link.includes("Ol%C3%A1"),
    link,
  );

  check("formatBRL", formatBRL(18000).replace(/ /g, " ") === "R$ 180,00", formatBRL(18000));
  check("parseBRL aceita '1.234,56'", parseBRL("1.234,56") === 123456);
  check("parseBRL aceita 'R$ 89,90'", parseBRL("R$ 89,90") === 8990);
  const fee = applyFee(18000, 4.99);
  check("taxa 4,99% sobre R$180 → líquido R$ 171,02", fee.feeCents === 898 && fee.netCents === 17102, fee);
}

async function main() {
console.log("\n── Regra 4: fila do dia (contra o banco do seed) ──");
{
  const professional = await prisma.professional.findFirst();
  if (!professional) {
    check("profissional do seed existe", false);
  } else {
    const queue = await buildMessageQueue(professional.id);
    const kinds = new Set(queue.map((q) => q.kind));
    const byName = (name: string) => queue.filter((q) => q.client.name.startsWith(name));

    check("fila não está vazia", queue.length > 0, queue.length);
    check(
      "Patrícia (dia 16 do ciclo) recebe aviso de MANUTENCAO",
      byName("Patrícia").some((q) => q.kind === "MANUTENCAO"),
      [...kinds],
    );
    check(
      "Fernanda (aniversário hoje) recebe ANIVERSARIO",
      byName("Fernanda").some((q) => q.kind === "ANIVERSARIO"),
      [...kinds],
    );
    check(
      "Carla (75 dias sem retorno) recebe RESGATE_60",
      byName("Carla").some((q) => q.kind === "RESGATE_60"),
      [...kinds],
    );
    check(
      "Juliana (dia 14, aviso configurado p/ dia 15) ainda NÃO recebe manutenção",
      !byName("Juliana").some((q) => q.kind === "MANUTENCAO"),
    );
    check(
      "agendamentos de amanhã têm LEMBRETE_24H",
      queue.some((q) => q.kind === "LEMBRETE_24H"),
      [...kinds],
    );
    const comLink = queue.every((q) => q.waUrl?.startsWith("https://wa.me/55"));
    check("todos os itens têm link wa.me pronto", comLink);
  }
}

console.log(`\n═══ Resultado: ${passed} ✅  ${failed} ❌ ═══`);
await prisma.$disconnect();
process.exit(failed > 0 ? 1 : 0);
}

void main();
